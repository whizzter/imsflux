// create a global store registry to hold data between reloads.
if ("undefined" === typeof __imsflux_store_registry__) {
	if ("undefined"!=typeof window) {
		window.__imsflux_store_registry__=Object.create(null);
	} else {
		__imsflux_store_registry__=Object.create(null);
	}
}

// the event queue (allows us to do multiple dispatches independantly of other things)
let dispatching=false;
let queue=[];

// our main interface
var imsflux={};

// the dispatch function
imsflux.dispatch=function (storeName,evtName,...args) {
	if (!(storeName in __imsflux_store_registry__))
		throw new Error("imsflux : No such store "+storeName);
	let store=__imsflux_store_registry__[storeName];
	if (!(evtName in store.functions))
		throw new Error("imsflux : No event named "+evtName+" in store "+storeName);
	// enqueue the action
	queue.push(()=>{
		let newState=store.functions[evtName].apply(store.state,args);
		// update state and any listeners
		if (newState !== store.state) {
			store.state=newState;
			for (let l of store.listeners)
				l(newState);
		}
	});
	// run the queue in case we're not fired from within an dispatch.
	if (!dispatching) {
		dispatching=true;
		// recompute queue and all dependants in queue.
		try {
			while(queue.length)
				queue.shift()();
		} catch (e) {
			dispatching=false;
			throw e;
		}
		dispatching=false;
	}
}
let noinitial={};
imsflux.store=function (name,initial=noinitial,functions=false) {
	let store;
	if (name in __imsflux_store_registry__) {
		// use existing store.
		store=__imsflux_store_registry__[name];
	} else {
		// make a new store
		let intrf={
				listen(listener) {
					store.listeners.push(listener);
					return intrf;
				},
				unlisten(listener) {
					store.listeners=store.listeners.filter( (item)=>item!=listener );
					return intrf;
				},
				get() {
					return store.state;
				}
			};
		__imsflux_store_registry__[name]=store={
			listeners:[],
			state:initial,
			hasInitial:initial!==noinitial,
			_interface:intrf
		};
	}
	// if the initial value wasn't set before then set the value now.
	if (!store.hasInitial & initial!==noinitial) {
		store.hasInitial=true;
		store.state=initial;
	}
	// do we want to update the stores functions?
	if (functions!==false)
		store.functions=functions; // Object.assign(store,{functions});
	return store._interface;
}



export default imsflux;
