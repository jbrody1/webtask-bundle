'use strict';

const MemoryFs = require('memory-fs');
const Rx = require('rxjs');
const Webpack = require('webpack');


module.exports = compileBundle;


function compileBundle(options) {
    const memFs = new MemoryFs();
    const compiler = Webpack(options.webpackConfig);
    let generation = 0;
    
    compiler.outputFileSystem = memFs;
    
    return Rx.Observable.create(function (subscriber) {
        if (options.watch) {
            const watcher = compiler.watch({}, onWatch);
            
            // Return an async disposer function
            return Rx.Observable.defer(function () {
                return Rx.Observable.bindNodeCallback(watcher.close.bind(watcher));
            });
        } else {
            compiler.run(onRun);
        }
        
        function onGeneration(stats) {
            try {
                const info = stats.toJson();
                const code = stats.hasErrors()
                    ?   undefined
                    :   memFs.readFileSync('/bundle.js', 'utf8');
                
                subscriber.next({
                    code: code,
                    generation: ++generation,
                    stats: info,
                    config: options.webpackConfig,
                });
            } catch (e) {
                subscriber.error(e);
            }
            
        }
        
        function onRun(err, stats) {
            if (err) {
                console.warn(err.message);
                
                return subscriber.error(err);
            }
            
            onGeneration(stats);
            
            subscriber.complete();
        }
        
        function onWatch(err, stats) {
            if (err) {
                console.warn(err.message);
                
                return subscriber.error(err);
            }
            
            onGeneration(stats);
        }
    });
}
