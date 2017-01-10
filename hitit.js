/*
hitit - v0.1.1

Written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.

Please refer to readme.md to read the annotated source (but not yet!).
*/

(function () {

   // *** SETUP ***

   var fs      = require ('fs');
   var http    = require ('http');

   var dale    = require ('dale');
   var teishi  = require ('teishi');

   var type    = teishi.t;
   var log     = teishi.l;

   var h = exports;

   h.one = function (state, o, cb) {

      if (teishi.stop ([
         ['options', o, 'object'],
         function () {return [
            ['options.tag', o.tag, 'string'],
            ['options.port', o.port, ['integer', 'function', 'undefined'], 'oneOf'],
            [type (o.port) === 'function', ['options.port', o.port, {min: 1, max: 65535}, teishi.test.range]],
            ['options.host',   o.host,   ['string', 'function', 'undefined'], 'oneOf'],
            ['options.method', o.method, ['string', 'function', 'undefined'], 'oneOf'],
            ['options.path',   o.path,   ['string', 'function', 'undefined'], 'oneOf'],
            function () {
               return ['options.method', o.method.toLowerCase (), ['get', 'head', 'post', 'put', 'delete', 'trace', 'connect', 'patch', 'options'], teishi.test.equal, 'oneOf']
            },
            ['options.headers', o.headers, ['object', 'function', 'undefined'], 'oneOf'],
            ['options.code', o.code, [undefined, 0, -1].concat (dale.do (http.STATUS_CODES, function (v, k) {return parseInt (k)})), teishi.test.equal, 'oneOf'],
            ['options.apres', o.apres, ['undefined', 'function'], 'oneOf'],
            ['state', state, 'object'],
         ]},
         ['cb', cb, 'function']
      ], function (error) {
         cb ({
            code: -2,
            error: error
         });
      })) return;

      var resolve = function (w) {
         if (type (w) === 'function') return w (state);
         else                         return w;
      }

      o.headers = dale.obj (resolve (o.headers) || {}, resolve (state.headers) || {}, function (v, k) {return [k, v]});

      o.body = resolve (o.body);

      if (teishi.complex (o.body)) {
         o.body = JSON.stringify (o.body);
         if (! o.headers ['content-type']) o.headers ['content-type'] = 'application/json';
      }
      else o.body = o.body + '';

      var opt = {
         port:     resolve (o.port)   || resolve (state.port),
         hostname: resolve (o.host)   || resolve (state.host),
         method:   resolve (o.method) || resolve (state.method),
         headers:  o.headers,
         path:     resolve (o.path),
      };

      var request = http.request (opt, function (response) {
         response.setEncoding ('utf8');
         response.body = '';

         response.on ('data', function (buffer) {
            response.body += buffer.toString ();
         });

         response.on ('end', function () {
            var rdata = {
               tag: o.tag,
               code: response.statusCode,
               headers: response.headers,
               body: response.body,
               req: opt,
               reqbody: o.body
            }
            var parsed;
            if ((response.headers ['content-type'] || '').match (/^application\/json/)) {
               parsed = teishi.p (response.body);
               if (parsed === false) return cb (dale.obj (0, rdata, function () {
                  return ['error', 'Invalid JSON!'];
               }));
               rdata.body = parsed;
            }

            if (rdata.code !== (o.code || 200)) return cb (rdata);
            if (o.apres) {
               var result = o.apres (state, o, rdata, cb);
               if (result === undefined) return;
               return result ? cb (null, rdata) : cb (rdata);
            }
            cb (null, rdata);
         });

         response.on ('error', function (error) {
            cb ({
               code: 0,
               error: error.toString ()
            });
         });
      });

      request.on ('error', function (error) {
         cb ({
            code: -1,
            error: error.toString ()
         });
      });

      request.end (o.body);
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
            if (type (v) === 'array' && type (v [0]) !== 'string') preproc (v);
            else fseq.push (map ? map (v) : v);
         });
      }

      preproc (seq);

      var CB = function (error, data) {
         log ('Starting request', fseq [counter].tag, '(' + (counter + 1) + '/' + fseq.length + ')');
         h.one (state, fseq [counter++], function (error, data) {
            if (error) return cb (error, hist);
            hist.push (data);

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
         apres:   req [6]
      }
   }

}) ();
