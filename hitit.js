/*
hitit - v1.2.2

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
*/

(function () {

   // *** SETUP ***

   var fs      = require ('fs');
   var http    = require ('http');
   var https   = require ('https');
   var Path    = require ('path');

   var dale    = require ('dale');
   var mime    = require ('mime');
   var teishi  = require ('teishi');

   var type    = teishi.t;
   var log     = teishi.l;

   var h = exports;

   h.one = function (state, o, cb) {

      var resolve = function (w, copy) {
         return type (w) === 'function' ? w (state) : (copy ? teishi.c (w) : w);
      }

      if (type (o) === 'object' && type (state) === 'object') {
         dale.do (['tag', 'host', 'port', 'method', 'path', 'body', 'code', 'apres', 'delay', 'timeout', 'https', 'rejectUnauthorized'], function (k) {
            if (k === 'apres') return;
            if (o [k] === undefined) o [k] = resolve (state [k], k === 'body');
            else                     o [k] = resolve (o [k]);
         });
         o.apres = o.apres || state.apres;
      }

      if (teishi.stop ([
         ['state',   state, 'object'],
         ['options', o,     'object'],
         ['cb', cb, ['function', 'undefined'], 'oneOf'],
         function () {return dale.do ({
            string:  ['tag', 'host', 'method', 'path'],
            integer: ['port', 'delay', 'timeout'],
            boolean: ['https', 'rejectUnauthorized', 'raw'],
            function: 'apres',
            headers: 'object'
         }, function (keys, type) {
            return dale.do (keys, function (key) {
               return ['options.' + key, o [key], [type, 'undefined'], 'oneOf']
            })
         })},
         function () {return [
            ['o.code', o.code, ['*', undefined, 0, -1].concat (dale.do (http.STATUS_CODES, function (v, k) {return parseInt (k)})), teishi.test.equal, 'oneOf'],
            [o.port !== undefined, ['options.port', o.port, {min: 1, max: 65535}, teishi.test.range]],
            [o.method !== undefined, ['options.method', (o.method || ''    ).toLowerCase (), ['get', 'head', 'post', 'put', 'delete', 'trace', 'connect', 'patch', 'options'], teishi.test.equal, 'oneOf']],
         ]},
      ], function (error) {
         if (type (cb) === 'function') cb ({
            code: -2,
            error: error
         });
         else log (error);
      })) return;

      cb = cb || log;

      o.headers = dale.obj (o.headers || {}, teishi.c (state.headers) || {}, function (v, k) {return [k, v]});

      var multipart = type (o.body) === 'object' && o.body.multipart;
      if (multipart) {
         var boundary = Math.floor (Math.random () * Math.pow (10, 16));
         o.headers ['content-type'] = 'multipart/form-data; boundary=' + boundary;
      }

      else if (teishi.complex (o.body)) {
         o.body = JSON.stringify (o.body);
         if (! o.headers ['content-type']) o.headers ['content-type'] = 'application/json';
      }
      else o.body = o.body + '';

      if (o.path [0] !== '/') o.path = '/' + o.path;

      var startTime = Date.now ();
      var request = (o.https ? https : http).request ({
         port:     o.port,
         hostname: o.host,
         method:   o.method,
         headers:  o.headers,
         path:     o.path,
         rejectUnauthorized: ! o.rejectUnauthorized === false
      }, function (response) {
         if (! o.raw) {
            response.setEncoding ('utf8');
            response.body = '';
         }
         else response.body = [];

         response.on ('data', function (buffer) {
            ! o.raw ? response.body += buffer.toString () : response.body.push (buffer);
         });

         response.on ('end', function () {
            var rdata = {
               code:    response.statusCode,
               headers: response.headers,
               body:    ! o.raw ? response.body : Buffer.concat (response.body),
               time:    [startTime, Date.now ()],
               request: o
            }
            if (! o.raw) {
               var parsed;
               if ((response.headers ['content-type'] || '').match (/^application\/json/)) {
                  parsed = teishi.p (response.body);
                  if (parsed === false) return cb (dale.obj (0, rdata, function () {
                     return ['error', 'Invalid JSON!'];
                  }));
                  rdata.body = parsed;
               }
            }

            if (o.code !== '*' && rdata.code !== (o.code || 200)) return cb (rdata);
            setTimeout (function () {
               if (o.apres) {
                  var result = o.apres (state, o, rdata, cb);
                  if (result === undefined) return;
                  return result ? cb (null, rdata) : cb (rdata);
               }
               cb (null, rdata);
            }, o.delay || 0);
         });

         response.on ('error', function (error) {
            cb ({code: 0, error: error.toString (), request: o});
         });
      });

      var timeout;
      if (o.timeout === undefined) o.timeout = 60;
      request.setTimeout (o.timeout * 1000, function () {
         timeout = true;
         request.abort ();
         cb ({code: 0, error: 'Timed out after ' + o.timeout + ' seconds, request aborted.', request: o});
      });

      request.on ('error', function (error) {
         if (! timeout) cb ({code: -1, error: error.toString (), request: o});
      });

      if (! multipart) request.end (o.body);
      else {
         var content = type (o.body.multipart) === 'array' ? o.body.multipart : [o.body.multipart];

         var queue = [], counter = 1, rwrite = function (what, enc, p) {
            if (p === undefined) {
               p = counter++;
               queue.push (p);
            }
            if (Math.min.apply (Math, queue) === p) {
               var cb = function () {
                  queue.splice (queue.indexOf (p), 1);
                  if (queue.length === 0) request.end ();
               }
               if (what.length === 0) cb ();
               else request.write (what, enc, cb);
            }
            else setTimeout (function () {
               rwrite (what, enc, p);
            }, 1);
         }

         dale.do (content, function (v) {
            if (type (v) !== 'object') return log ('Invalid multipart file or field!', v);
            if (v.path && ! v.filename) v.filename = Path.basename (v.path);
            rwrite ('--' + boundary + '\r\n' + 'Content-Disposition: form-data; name="' + v.name + '";');
            if (v.filename) rwrite (' filename="' + encodeURIComponent (v.filename) + '"');
            var contentType = v.contentType || (v.path ? mime.lookup (v.path) : (teishi.complex (v.value) ? 'application/json' : 'text/plain'));
            if (contentType !== 'application/octet-stream') rwrite ('\r\nContent-Type: ' + contentType + '; charset=utf-8');
            rwrite ('\r\n\r\n');
            rwrite (v.path ? fs.readFileSync (v.path, 'binary') : (teishi.complex (v.value) ? teishi.s (v.value) : v.value + ''), v.path ? 'binary' : 'utf8');
            rwrite ('\r\n');
         });
         rwrite ('--' + boundary + '--\r\n');
      }
   }

   h.seq = function (state, seq, cb, map) {
      if (teishi.stop ([
         ['state', state, 'object'],
         ['sequence', seq, 'array'],
         ['cb', cb, 'function'],
         ['map', map, ['function', 'undefined'], 'oneOf'],
      ], cb)) return;

      if (seq.length === 0) return [];
      var fseq    = [];
      var counter = 0;
      var hist    = [];

      var preproc = function (seq) {
         dale.do (seq, function (v) {
            if (! v || (type (v) === 'array' && v.length === 0)) return;
            if (type (v) === 'array' && teishi.complex (v [0])) preproc (v);
            else fseq.push (map ? map (v) : v);
         });
      }

      preproc (seq);

      var CB = function () {
         log ('Starting request', fseq [counter].tag, '(' + (counter + 1) + '/' + fseq.length + ')');
         h.one (state, fseq [counter++], function (error, rdata) {
            if (error) return cb (error, hist);
            hist.push (rdata);

            if (counter < fseq.length) CB ();
            else cb (null, hist);
         });
      }
      CB ();
   }

   h.stdmap = function (req) {
      return {
         tag:     req [0],
         method:  req [1],
         path:    req [2],
         headers: req [3],
         body:    req [4],
         code:    req [5],
         apres:   req [6],
         delay:   req [7]
      }
   }

}) ();
