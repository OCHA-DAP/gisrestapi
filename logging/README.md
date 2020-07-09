# DESCRIPTION OF LOGGING IN GISAPI

## TL;DR
*  one log file will be written to */var/log/gisapi.log* in a standard format. Example
    ```
    2020-07-08 16:00:44 INFO [/srv/gisapi/endpoints/tiles/index.js] Created vector tile service: /services/shapefile/Ken_CountyWithWater/vector-tiles/:z/:x/:y.*
    ```
*  another logfile with things that couldn't be standardized is in */var/log/gisapi_other.log*. Please note that this file does **start with a timestamp that is in the same format** as the one above. Example:
    ```
    2020-07-08 16:00:45 [millstone] processing style 'style.mss'
    ```


## More info
There are 2 types of outpus that GISAPI produces:
1.  Logs from the application itself (*/var/log/gisapi.log*)
    *  have been rewritten to use [winston](https://github.com/winstonjs/winston#readme) library
    *  [express-winston](https://github.com/bithavoc/express-winston#readme) library was used to log the information from the express framework
    *  many of the logs have been "downgraded" to DEBUG so that the log is less verbose
    *  this is configurred in [loggign/logging.js](logging.js) file
2.  Logs produced by other libraries that can't be configured to use *winston* (*/var/log/gisapi_other.log*)
    * These are redirected to file from [docker/run_gisapi](../docker/run_gisapi) via `exec nodejs app.js 2>&1 | ts '%Y-%m-%d %H:%M:%S' >> /var/log/gisapi_other.log`
    * *ts* is used to add a timestamp to each line