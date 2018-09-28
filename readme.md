# hitit

hitit is a minimalistic tool for testing an HTTP(S) API. It is a stopgap until I publish the next version of [kaboot](https://github.com/fpereiro/kaboot).

## Current status of the project

The current version of hitit, v1.2.2, is considered to be *mostly stable* and *mostly complete*. [Suggestions](https://github.com/fpereiro/hitit/issues) and [patches](https://github.com/fpereiro/hitit/pulls) are welcome. Future changes planned are:

- Support for concurrent testing (a.k.a stress testing).

## Installation

The dependencies of hitit are three:

- [dale](https://github.com/fpereiro/dale)
- [mime](https://github.com/broofa/node-mime)
- [teishi](https://github.com/fpereiro/teishi)

To install, type `npm i hitit`.

To use hitit, you need node.js v0.8.0 or newer.

## Usage

### `h.one`

To do a single request, use `h.one`. This function takes three arguments: `state`, `options` and `callback`.

`options` must be an object. These are the options for the request; any of them can be `undefined`.
- `tag`: an optional string that will be printed to the console when the request is started.
- `host`: optional string.
- `port`: optional integer.
- `method`: optional string. If defined, must be a valid HTTP method.
- `path`: optional string.
- `headers`: optional object.
- `body`: can be of any type. See below for more details.
- `code`: any valid HTTP status code; defaults to 200. If the response has a different matching code, the request will be considered as a failure. If you want the request to succeed in any case, you can use `'*'` as the status code.
- `apres`: a function that is executed after the request finishes. See below for more details.
- `delay`: optional integer that determines how many milliseconds should be waited until the next request.
- `timeout`: optional integer that will abort the request after `body.timeout` seconds elapse of socket inactivity. Defaults to `60`.
- `https`: optional boolean. If true, `https` will be used instead of `http`.
- `rejectUnauthorized`: optional boolean. If `false`, insecure `https` will be accepted by default (this is useful when you're testing with a self-signed certificate).
- `raw`: optional boolean. If true, the response's body will be returned as a raw buffer.

`state` must also be an object. It serves two purposes: #1 keep state between requests; and #2 have default values for some request parameters. Regarding keeping state between requests, you can assign any key in this object for your own purposes, *as long as is none of the keys that `options` can have*. If you assign a key that is one of the `options` keys (for example, `host`), if `options.host` is `undefined`, `state.host` will be considered as the `host`. This is what enables #2.

Many times it is useful to make a request depending on `state`. For that reason, any of the keys of `options` can also be a function; if so, it will be evaluated passing `state` as its only argument. For example, if `state.id` is `3` and you define `options.path` to be `function (state) {return 'download/' + state.id}`, this is equivalent to setting `options.path` to `'download/3'`. Note that also the matching keys of `state` are evaluated in this way if they are functions.

The `body` can be of any type. If it's `null` or `undefined`, it will be considered an empty string. If it's neither an array or an object, it will be coerced a string. If it is either an array or an object with `body.multipart` being `undefined`, it will be considered a JSON. In this case, it will be automatically stringified and the `content-header` will be set to `application/json` (unless you override this default). Finally, if `body` is an object and `body.multipart` is defined, hitit will do a `multipart/form-data` request. `body.multipart` can be either an object or an array of objects. Each of these objects can represent either a `field` or a `file`. In the case of a `field`, the object will have three keys: `type: 'field'`, `name: STRING` and `value: STRING`. In the case of a `file`, the object will have these fields: `type: 'file'`, `name: STRING`, either `value` or `path` (the first to provide the literal value of the file, the second a path to where the file is) and an optional `contentType` - in its absence, if `path` is provided, a mime lookup of the file will be performed. In my case, I always override this by setting `contentType` to `application/octet-stream`.

```javascript
// Example
body.multipart = {
   {type: 'field', name: 'field1', value: 'somedata'},
   {type: 'file',  name: 'file1', path: 'test/image.jpg', contentType: 'application/octet-stream'},
}
```

The `apres` is an optional function that is executed after the request, but only if the response's status code matches the expected `code`. It receives four arguments: `state`, `options`, `rdata` and `callback`. The only one that needs explanation is `rdata`: it consists of an object with five keys: `code`, which is the status code of the response; `headers`, which contain the headers of the response; `body`, which contains the body of the response (parsed to a string or to an array/object, in case the `content-type` header of the response is `application/json`); `time`, an array with the time when the requested started and the time when the request ended. And finally, `request`, which is equal to `options`.

The `apres` function can halt or suspend execution depending on its return value. if it returns `false`, this is considered to be an error and `callback` will be called with an error. If it returns `true`, execution will continue. If it returns `undefined`, execution will be suspended. This is useful for asynchronous operations; if you wish to resume execution, you can call `callback` with a falsy first argument, indicating the absence of an error.

If you're calling `h.one` directly, the concept of sequence is irrelevant. However, `h.seq` invokes `h.one`, so your tests can exert control flow from inside the `apres`.

`callback` is the callback function that is called at the end of the request. It receives two arguments, `error` and `rdata`. If there was an error, `error` will have an error code (-2 if the arguments are invalid, -1 if there was an error during the start of the request, and 0 if the request started but the response server became unresponsive, or if there was a timeout). `error.request` will contain the request parameters. Also, if the `code` didn't match the response's status code, `rdata` will be passed as `error`. In the absence of error, `rdata` is received as a second argument.

### `h.seq`

This function accepts a sequence of requests and executes them in turn. It takes four arguments:

- `state`, an object (the same `state` that will be passed to `h.one`).
- `sequence`, an array with requests.
- `callback`, a callback function.
- `map`, an optional function that transforms each of the elements in `requests`.

`callback` will always receive `error` as its first argument and an array of `rdata`s as its second. If the sequence was completed successfully, `error` will be `undefined`.

In the simplest case, `sequence` can be an array with a number of objects, each of them a valid `options` object that can be passed to `h.one`. However, you can have nested arrays with `options` inside; `h.seq` will unnest the array for you. This is useful when you have functions returning tests.

If any of the components of `sequence` has a falsy value or is an empty array, it will be ignored. This is useful for creating conditional tests. However, these conditions cannot depend on the dynamic `state` of the test; rather, the conditional must depend on a condition that is defined when `h.seq` is invoked.

Finally, you can use a function for converting each of the elements within `sequence` to a valid `h.one` `options` object. For example, the default `h.stdmap` function converts the following array:

```javascript
['a tag', 'a method', 'a path', 'headers', 'a body', 'a code', 'an apres', 'a delay']
```

into

`{tag: 'a tag', method: 'a method', path: 'a path', headers: 'headers', body: 'a body', code: 'a code', apres: 'an apres', delay: 'a delay'}`

In this case, notice that `host` and `port` are not defined and must hence be passed through `state`.

## Source code

The complete source code is contained in `hitit.js`. It is about 240 lines long.

## License

hitit is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
