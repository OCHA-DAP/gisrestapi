//Express, Common and settings should be used by all sub-modules
var express = require('express'), common = require("../../common"), settings = require('../../settings/settings'),
  referrerCheck = require('../../utils/referrer-header-check');
var flow = require('flow'), fs = require("fs"), http = require("http"), path = require("path"), tables = require("../tables");
var mapnik = require('mapnik'),
  mercator = require('../../utils/sphericalmercator.js'), // 3857
  geographic = require('../../utils/geographic.js'), //4326
  zlib = require("zlib"),
  crypto = require("crypto");

//Caching
var CCacher = require("../../lib/ChubbsCache");
var cacher = new CCacher();

exports.app = function (passport) {
  var app = express();
  app.all('/services/hdx/refresh_table/', function (req, res) {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    // var spatialTables = app.get('spatialTables');
    // var tableName = req.params.table;
    // var columnName = req.params.column;
    // var spatialTablesKey = tableName + "_" + columnName;



    // if ( spatialTables && !spatialTables.hasOwnProperty(spatialTablesKey)) {
    //   spatialTables[spatialTablesKey] = {}
    //   var query = {
    //     text: 'select ST_SRID(' + rasterOrGeometry.name + ') as SRID FROM "' + this.args.table + '" LIMIT 1;',
    //     values: []
    //   };

    //   var afterSRIDCallback = function (srid) {
    //     this.spatialTables[this.args.table].srid = result.rows[0].srid;
    //   }
    //   common.executePgQuery(query, afterSRIDCallback);
    // }

    common.respond(req, res, {
      format: 'json',
      infoMessage: 'Done'
    });
  });
  app.all('/services/hdx/vector_tiles/:table/:column/:z/:x/:y.*', cacher.cache('day'), function (req, res) {
    var geomColumn = req.params.column;
    var table = req.params.table;
    // var x = req.params.x;
    // var y = req.params.y;
    // var z = req.params.z;
    var existingTables = tables.getExistingSpatialTables();
    // for (k in existingTables) {
    //   delete existingTables[k];
    // }
    var key = table + "_" + geomColumn;

    var respondWithVectorTile = function () {
      var item = existingTables[key];
      if (!item) {
        res.removeHeader('Content-Encoding');
        res.writeHead(404, {
          'Content-Type': 'application/octet-stream'
        });
        res.end();
        return;
      }

      var _self = {
        settings: {
          mapnik_datasource: {
            'host': settings.pg.server,
            'port': settings.pg.port,
            'dbname': settings.pg.database,
            //'table': item.table,
            'table': ('(SELECT ' + geomColumn + ' from "' + table + '"' + ') as "' + table + '"'),

            'user': settings.pg.username,
            'password': settings.pg.password,
            'type': 'postgis',
            'estimate_extent': 'false',
            'geometry_field': geomColumn,
            'srid': item.srid,
            'geometry_type': item.type
          },
          routeProperties: {
            geom_field: geomColumn,
            table: table,
            name: "PROJ_LIB",
            srid: item.srid,
            source: "postgis"
          }
        },
        performanceObject: {
          times: []
        }
      }

      //Start Timer to measure response speed for tile requests.
      var startTime = Date.now();

      var args = common.getArguments(req);

      //If user passes in where clause or fields, then build the query here and set it with the table property of postgis_setting
      if (args.fields || args.where) {
        //Validate where - TODO

        //If a where clause was passed in, and we're using a postgis datasource, allow it
        if (_self.settings.mapnik_datasource.type.toLowerCase() == 'postgis') {
          console.log("!!! PG simplify 2 ");
          _self.settings.mapnik_datasource.table = (args.fields ? '(SELECT ' + _self.settings.routeProperties.geom_field + (args.fields ? ',' + args.fields : '') + ' from "' + _self.settings.routeProperties.table + '"' + (args.where ? ' WHERE ' + args.where : '') + ') as "' + _self.settings.routeProperties.table + '"' : '"' + _self.settings.routeProperties.table + '"');
        }
      }

      // debugger;
      //Make the mapnik datasource.  We wait until now in case the table definition changes if a where clause is passed in above.
      _self.mapnikDatasource = (_self.settings.mapnik_datasource.describe ? _self.settings.mapnik_datasource : new mapnik.Datasource(_self.settings.mapnik_datasource));


      try {
        //create map
        var map = new mapnik.Map(256, 256, mercator.proj4);

        var layer = new mapnik.Layer(_self.settings.routeProperties.name, ((_self.epsg && (_self.epsg == 3857 || _self.epsg == 3587)) ? mercator.proj4 : geographic.proj4));

        var label_point_layer;
        console.log("!!! BEFORE SELECT ");
        if (args.labelpoints && _self.settings.mapnik_datasource.type.toLowerCase() == 'postgis') {
          //If user specifies label points to be created, then create another layer in this vector tile that stores the centroid to use as a label point.

          //The only difference in the datasource is the table parameter, which is either a table name, or a sub query that allows you specify a WHERE clause.
          console.log("!!! PG simplify ");
          _self.settings.mapnik_datasource.table = (args.fields ? '(SELECT ' + ('ST_PointOnSurface(ST_SimplifyPreserveTopology(' + _self.settings.routeProperties.geom_field + '), 5) as geom') + (args.fields ? ',' + args.fields : '') + ' from "' + _self.settings.routeProperties.table + '"' + (args.where ? ' WHERE ' + args.where : '') + ') as "' + _self.settings.routeProperties.table + "_label" + '"' : '"' + _self.settings.routeProperties.table + '"');

          //Make a new Mapnik datasource object
          _self.mapnikDatasource_label = (_self.settings.mapnik_datasource.describe ? _self.settings.mapnik_datasource : new mapnik.Datasource(_self.settings.mapnik_datasource));


          label_point_layer = new mapnik.Layer(_self.settings.routeProperties.name + "_label", ((_self.epsg && (_self.epsg == 3857 || _self.epsg == 3587)) ? mercator.proj4 : geographic.proj4));
          label_point_layer.datasource = _self.mapnikDatasource_label;
          label_point_layer.styles = [_self.settings.routeProperties.table, 'default'];

          //Add label layer
          map.add_layer(label_point_layer);
        }

        var bbox = mercator.xyz_to_envelope(+req.param('x'), +req.param('y'), +req.param('z'), false);

        layer.datasource = _self.mapnikDatasource;
        layer.styles = [_self.settings.routeProperties.table, 'default'];

        map.bufferSize = 10;

        map.add_layer(layer);

        console.log(map.toXML());

        //From Tilelive-Bridge - getTile
        // set source _maxzoom cache to prevent repeat calls to map.parameters
        if (_self._maxzoom === undefined) {
          _self._maxzoom = map.parameters.maxzoom ? parseInt(map.parameters.maxzoom, 10) : 14;
        }

        var opts = {};
        // use tolerance of 32 for zoom levels below max
        opts.tolerance = req.param('z') < _self._maxzoom ? 32 : 0;
        // make larger than zero to enable
        opts.simplify = 0;
        opts.simplify_distance = 20.0;
        console.log("!!! SIMPLIFYING ");
        // 'radial-distance', 'visvalingam-whyatt', 'zhao-saalfeld' (default)
        opts.simplify_algorithm = 'zhao-saalfeld';

        res.setHeader('Content-Type', 'application/x-protobuf');

        map.extent = bbox;
        // also pass buffer_size in options to be forward compatible with recent node-mapnik
        // https://github.com/mapnik/node-mapnik/issues/175
        opts.buffer_size = map.bufferSize;

        map.render(new mapnik.VectorTile(+req.param('z'), +req.param('x'), +req.param('y')), opts, function (err, image) {

          if (err || !image) {
            res.removeHeader('Content-Encoding');
            res.writeHead(500, {
              'Content-Type': 'application/x-protobuf'
            });
            res.end();
            return;
          }

          // Fake empty RGBA to the rest of the tilelive API for now.
          // image.isSolid(function (err, solid, key) {
          if (err) {
            res.writeHead(500, {
              'Content-Type': 'text/plain'
            });

            res.end(err.message);
            return;
          }
          // Solid handling.
          var done = function (err, buffer) {
            if (err) {
              res.writeHead(500, {
                'Content-Type': 'text/plain'
              });

              res.end(err.message);
              return;
            }

            if (true) {
              var duration = Date.now() - startTime;
              _self.performanceObject.times.push(duration);

              res.send(buffer); //return response
              return;
            }

            // Empty tiles are equivalent to no tile.
            if (_self._blank) {
              res.removeHeader('Content-Encoding');
              res.writeHead(404, {
                'Content-Type': 'application/octet-stream'
              });


              res.end(); //new Buffer('Tile is blank or does not exist', "utf-8")
              return;
            }

            // Fake a hex code by md5ing the key.
            var mockrgb = crypto.createHash('md5').update(buffer).digest('hex').substr(0, 6);
            buffer.solid = [parseInt(mockrgb.substr(0, 2), 16), parseInt(mockrgb.substr(2, 2), 16), parseInt(mockrgb.substr(4, 2), 16), 1].join(',');
            res.send(buffer);

          };

          //Compress if they ask for it.
          if (res.req.headers["accept-encoding"] && res.req.headers["accept-encoding"].indexOf("gzip") > -1) {
            res.setHeader('content-encoding', 'gzip');
            zlib.gzip(image.getData(), done);
          } else {
            done(null, image.getData());
          }
          // });
        });

      } catch (err) {
        res.writeHead(500, {
          'Content-Type': 'text/plain'
        });

        res.end(err.message);
      }
    }

    if (!existingTables[key]) {
      fakeTablesApp = {
        get: function() {
          return tables.getExistingSpatialTables();
        },
        set: function(spatialTables) {
          tables.setExistingSpatialTables(spatialTables);
        }
      }
      console.log("Finding table: Tile " + req.params.z + " " + req.params.x + " " + req.params.y);
      common.findSpatialTables( fakeTablesApp, respondWithVectorTile, table, geomColumn);
    }
    else {
      console.log("Existing table: Tile " + req.params.z + " " + req.params.x + " " + req.params.y);
      respondWithVectorTile();
    }

  });
  return app;
}