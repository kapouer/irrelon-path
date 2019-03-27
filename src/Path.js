/**
 * A function that just returns the first argument.
 * @param {*} val The argument to return.
 * @returns {*} The passed argument.
 */
const returnWhatWasGiven = (val) => val;

/**
 * Converts any key matching the wildcard to a zero.
 * @param {String} key The key to test.
 * @returns {String} The key.
 */
const wildcardToZero = (key) => {
	return key === "$" ? "0" : key;
};

/**
 * If a key is a number, will return a wildcard, otherwise
 * will return the originally passed key.
 * @param {String} key The key to test.
 * @returns {String} The original key or a wildcard.
 */
const numberToWildcard = (key) => {
	// Check if the key is a number
	if (String(parseInt(key, 10)) === key) {
		// The key is a number, convert to a wildcard
		return "$";
	}
	
	return key;
};

/**
 * Removes leading period (.) from string and returns it.
 * @param {String} str The string to clean.
 * @returns {*} The cleaned string.
 */
const clean = (str) => {
	if (str.substr(0, 1) === ".") {
		str = str.substr(1, str.length - 1);
	}
	
	return str;
};

/**
 * Splits a path by period character, taking into account
 * escaped period characters.
 * @param {String} path The path to split into an array.
 * @return {Array} The component parts of the path, split
 * by period character.
 */
const split = (path) => {
	// Convert all \. (escaped periods) to another character
	// temporarily
	const escapedPath = path.replace(/\\\./g, "[--]");
	const splitPath = escapedPath.split(".");
	
	// Loop the split path array and convert any escaped period
	// placeholders back to their real period characters
	for (let i = 0; i < splitPath.length; i++) {
		splitPath[i] = splitPath[i].replace(/\[--]/g, ".");
	}
	
	return splitPath;
};

/**
 * Escapes any periods in the passed string so they will
 * not be identified as part of a path. Useful if you have
 * a path like "domains.www.google.com.data" where the
 * "www.google.com" should not be considered part of the
 * traversal as it is actually in an object like:
 * {
 * 	"domains": {
 * 		"www.google.com": {
 * 			"data": "foo"
 * 		}
 * 	}
 * }
 * @param {String} str The string to escape periods in.
 * @return {String} The escaped string.
 */
const escape = (str) => {
	return str.replace(/\./g, "\\.");
};

/**
 * Gets a single value from the passed object and given path.
 * @param {Object} obj The object to inspect.
 * @param {String} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {Object=} options Optional options object.
 * @returns {*} The value retrieved from the passed object at
 * the passed path.
 */
const get = (obj, path, defaultVal = undefined, options = {}) => {
	let internalPath = path,
		objPart;
	
	options = {
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven,
		...options
	};
	
	// No object data, return undefined
	if (obj === undefined) {
		return defaultVal;
	}
	
	// No path string, return the base obj
	if (!internalPath) {
		return obj;
	}
	
	internalPath = clean(internalPath);
	
	// Path is not a string, throw error
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}
	
	// Path has no dot-notation, return key/value
	if (internalPath.indexOf(".") === -1) {
		return obj[internalPath];
	}
	
	if (typeof obj !== "object") {
		return obj;
	}
	
	
	const pathParts = split(internalPath);
	objPart = obj;
	
	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = pathParts[i];
		objPart = objPart[options.transformKey(pathPart)];
		
		if (!objPart || typeof(objPart) !== "object") {
			break;
		}
	}
	
	return objPart !== undefined ? objPart : defaultVal;
};

/**
 * Sets a single value on the passed object and given path.
 * @param {Object} obj The object to inspect.
 * @param {String} path The path to set data on.
 * @param {*} val The value to assign to the obj at the path.
 * @param {Object=} options The options object.
 * @returns {*} Nothing.
 */
const set = (obj, path, val, options = {}) => {
	let internalPath = path,
		objPart;
	
	options = {
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven,
		...options
	};
	
	// No object data
	if (obj === undefined) {
		return;
	}
	
	// No path string
	if (!internalPath) {
		return;
	}
	
	internalPath = clean(internalPath);
	
	// Path is not a string, throw error
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}
	
	if (typeof obj !== "object") {
		return;
	}
	
	// Path has no dot-notation, set key/value
	if (internalPath.indexOf(".") === -1) {
		obj[options.transformKey(internalPath)] = val;
		return;
	}
	
	const pathParts = split(internalPath);
	objPart = obj;
	
	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = pathParts[i];
		const transformedPathPart = options.transformKey(pathPart);
		const tmpPart = objPart[transformedPathPart];
		
		if ((!tmpPart || typeof(objPart) !== "object")) {
			if (i !== pathParts.length - 1) {
				// Create an object or array on the path
				if (String(parseInt(pathPart, 10)) === pathPart) {
					// This is an array index
					objPart[transformedPathPart] = [];
				} else {
					objPart[transformedPathPart] = {};
				}
				
				objPart = objPart[transformedPathPart];
			}
		} else {
			objPart = tmpPart;
		}
		
		if (i === pathParts.length - 1) {
			// Set value
			objPart[transformedPathPart] = val;
		}
	}
};

/**
 * Push a value to an array on an object for the specified path.
 * @param {Object} obj The object to update.
 * @param {String} path The path to the array to push to.
 * @param {*} val The value to push to the array at the object path.
 * @returns {Object} The original object passed in "obj" but with
 * the array at the path specified having the newly pushed value.
 */
const push = (obj, path, val) => {
	if (obj === undefined || path === undefined) {
		return obj;
	}
	
	// Clean the path
	path = this.clean(path);
	
	const pathParts = split(path);
	const part = pathParts.shift();
	
	if (pathParts.length) {
		// Generate the path part in the object if it does not already exist
		obj[part] = obj[part] || {};
		
		// Recurse
		push(obj[part], pathParts.join("."), val);
	} else {
		// We have found the target array, push the value
		obj[part] = obj[part] || [];
		
		if (obj[part] instanceof Array) {
			obj[part].push(val);
		} else {
			throw("Cannot push to a path whose leaf node is not an array!");
		}
	}
	
	return obj;
};

/**
 * Given a path and an object, determines the outermost leaf node
 * that can be reached where the leaf value is not undefined.
 * @param {Object} obj The object to inspect.
 * @param {String} path The path to retrieve data from.
 * @param {Object=} options Optional options object.
 * @returns {String} The path to the furthest non-undefined value.
 */
const furthest = (obj, path, options = {}) => {
	let internalPath = path,
		objPart;
	
	options = {
		"transformRead": returnWhatWasGiven,
		"transformKey": wildcardToZero, // Any path that has a wildcard will essentially check the first array item to continue down the tree
		"transformWrite": returnWhatWasGiven,
		...options
	};
	
	const finalPath = [];
	
	// No path string, return the base obj
	if (!internalPath) {
		return finalPath.join(".");
	}
	
	internalPath = clean(internalPath);
	
	// Path is not a string, throw error
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}
	
	if (typeof obj !== "object") {
		return finalPath.join(".");
	}
	
	// Path has no dot-notation, return key/value
	if (internalPath.indexOf(".") === -1) {
		if (obj[internalPath] !== undefined) {
			return internalPath;
		}
		
		return finalPath.join(".");
	}
	
	const pathParts = split(internalPath);
	objPart = obj;
	
	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = pathParts[i];
		objPart = objPart[options.transformKey(pathPart)];
		
		if (objPart === undefined) {
			break;
		}
		
		finalPath.push(pathPart);
	}
	
	return finalPath.join(".");
};

/**
 * Traverses the object by the given path and returns an object where
 * each key is a path pointing to a leaf node and contains the value
 * from the leaf node from the overall object in the obj argument,
 * essentially providing all available paths in an object and all the
 * values for each path.
 * @param {Object} obj The object to inspect.
 * @param {String} path The path to retrieve data from.
 * @param {Object=} options Optional options object.
 * @returns {Object} The result of the traversal.
 */
const values = (obj, path, options = {}) => {
	const internalPath = clean(path);
	const pathParts = split(internalPath);
	const currentPath = [];
	const valueData = {};
	
	options = {
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven,
		...options
	};
	
	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = options.transformKey(pathParts[i]);
		currentPath.push(pathPart);
		
		const tmpPath = currentPath.join(".");
		
		valueData[tmpPath] = get(obj, tmpPath);
	}
	
	return valueData;
};

/**
 * Takes an object and finds all paths, then returns the paths as an
 * array of strings.
 * @param {Object} obj The object to scan.
 * @param {Array=} finalObj An object used to collect the path keys.
 * (Do not pass this in directly - use undefined).
 * @param {String=} parentPath The path of the parent object. (Do not
 * pass this in directly - use undefined).
 * @param {Object=} options An options object.
 * @returns {Array<String>} An array containing path strings.
 */
const flatten = (obj, finalObj = [], parentPath = "", options = {}) => {
	options = {
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven,
		...options
	};
	
	const transformedObj = options.transformRead(obj);
	
	const currentPath = (i) => {
		const tKey = options.transformKey(i);
		return parentPath ? parentPath + "." + tKey : tKey;
	};
	
	for (const i in transformedObj) {
		if (transformedObj.hasOwnProperty(i)) {
			if (options.ignore && options.ignore.test(i)) {
				continue;
			}
			
			if (typeof transformedObj[i] === "object") {
				flatten(transformedObj[i], finalObj, currentPath(i), options);
			}
			
			finalObj.push(currentPath(i));
		}
	}
	
	return finalObj;
};

/**
 * Takes an object and finds all paths, then returns the paths as keys
 * and the values of each path as the values.
 * @param {Object} obj The object to scan.
 * @param {Object=} finalObj An object used to collect the path keys.
 * (Do not pass this in directly).
 * @param {String=} parentPath The path of the parent object. (Do not
 * pass this in directly).
 * @param {Object=} options An options object.
 * @returns {Object} An object containing path keys and their values.
 */
const flattenValues = (obj, finalObj = {}, parentPath = "", options = {}) => {
	options = {
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven,
		...options
	};
	
	const transformedObj = options.transformRead(obj);
	
	const currentPath = (i) => {
		const tKey = options.transformKey(i);
		return parentPath ? parentPath + "." + tKey : tKey;
	};
	
	for (const i in transformedObj) {
		if (transformedObj.hasOwnProperty(i)) {
			if (typeof transformedObj[i] === "object") {
				flattenValues(transformedObj[i], finalObj, currentPath(i), options);
			}
			
			finalObj[currentPath(i)] = options.transformWrite(transformedObj[i]);
		}
	}
	
	return finalObj;
};

/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param {Array} args The arguments passed to the function,
 * spread using ES6 spread.
 * @returns {string} A final path string.
 */
const join = (...args) => {
	return args.reduce((arr, item) => {
		if (item !== undefined && String(item)) {
			arr.push(item);
		}
		
		return arr;
	}, []).join(".");
};

/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param {Array} args The arguments passed to the function,
 * spread using ES6 spread.
 * @returns {string} A final path string.
 */
const joinEscaped = (...args) => {
	const escapedArgs = args.map((item) => {
		return escape(item);
	});
	
	return join(...escapedArgs);
};

/**
 * Returns the specified path but removes the last
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "foo.bar".
 * @param {String} path The path to operate on.
 * @returns {String} The new path string.
 */
const up = (path) => {
	const parts = split(path);
	parts.pop();
	
	return parts.join(".");
};

/**
 * Counts the total number of key leaf nodes in the passed object.
 * @param {Object} obj The object to count key leaf nodes for.
 * @returns {Number} The number of keys.
 */
const countLeafNodes = (obj) => {
	let totalKeys = 0;
	
	for (const i in obj) {
		if (obj.hasOwnProperty(i)) {
			if (obj[i] !== undefined) {
				if (typeof obj[i] !== "object") {
					totalKeys++;
				} else {
					totalKeys += countLeafNodes(obj[i]);
				}
			}
		}
	}
	
	return totalKeys;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths.
 * @param {Object} testKeys The object describing the paths to test for.
 * @param {Object} testObj The object to test paths against.
 * @returns {Boolean} True if the object paths exist.
 */
const hasMatchingPathsInObject = function (testKeys, testObj) {
	let result = true;
	
	for (const i in testKeys) {
		if (testKeys.hasOwnProperty(i)) {
			if (testObj[i] === undefined) {
				return false;
			}
			
			if (typeof testKeys[i] === "object") {
				// Recurse object
				result = hasMatchingPathsInObject(testKeys[i], testObj[i]);
				
				// Should we exit early?
				if (!result) {
					return false;
				}
			}
		}
	}
	
	return result;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths and if so returns the number matched.
 * @param {Object} testKeys The object describing the paths to test for.
 * @param {Object} testObj The object to test paths against.
 * @returns {Object<matchedKeys<Number>, matchedKeyCount<Number>, totalKeyCount<Number>>} Stats on the matched keys.
 */
const countMatchingPathsInObject = (testKeys, testObj) => {
	const matchedKeys = {};
	
	let matchData,
		matchedKeyCount = 0,
		totalKeyCount = 0;
	
	for (const i in testObj) {
		if (testObj.hasOwnProperty(i)) {
			if (typeof testObj[i] === "object") {
				// The test / query object key is an object, recurse
				matchData = countMatchingPathsInObject(testKeys[i], testObj[i]);
				
				matchedKeys[i] = matchData.matchedKeys;
				totalKeyCount += matchData.totalKeyCount;
				matchedKeyCount += matchData.matchedKeyCount;
			} else {
				// The test / query object has a property that is not an object so add it as a key
				totalKeyCount++;
				
				// Check if the test keys also have this key and it is also not an object
				if (testKeys && testKeys[i] && typeof testKeys[i] !== "object") {
					matchedKeys[i] = true;
					matchedKeyCount++;
				} else {
					matchedKeys[i] = false;
				}
			}
		}
	}
	
	return {
		matchedKeys,
		matchedKeyCount,
		totalKeyCount
	};
};

module.exports = {
	wildcardToZero,
	numberToWildcard,
	clean,
	split,
	escape,
	get,
	set,
	push,
	furthest,
	values,
	flatten,
	flattenValues,
	join,
	joinEscaped,
	up,
	countLeafNodes,
	hasMatchingPathsInObject,
	countMatchingPathsInObject
};