const http = require("http");
const url = require("url");
const server = http.createServer();


// viewer

const fs = require("fs").promises;
const path = require("path");

class Viewer {

	constructor(templatePath, extension = ".html") {
		this.templatePath = templatePath;
		this.extension = extension;
	}

	getFilePath(name) {
		return path.join(__dirname, this.templatePath, name) + this.extension;
	}

	async render(name, data) {
		let filePath = this.getFilePath(name);
		return await fs.readFile(filePath);
	}

}

class SimpleViewer extends Viewer {

	constructor(templatePath) {
		super(templatePath);
	}

	async render(name, data) {
		let filePath = this.getFilePath(name);
		let html = await fs.readFile(filePath, "utf8");
		html = html.replaceAll("{{title}}", data.title);
		html = html.replaceAll("{{content}}", data.content.replaceAll(/\r?\n/g, "<br>"));
		return html;
	}

}

const viewer = new SimpleViewer("views");


// router object

let router = {
	callbacks: new Map(),
	get(pathname, callback) {
		this.setCallback("GET", pathname, callback);
	},
	post(pathname, callback) {
		this.setCallback("POST", pathname, callback)
	},
	setCallback(method, pathname, callback) {
		if (this.callbacks.has(pathname)) {
			this.callbacks.get(pathname)[method] = callback;
		} else {
			this.callbacks.set(pathname, {[method]: callback});
		}
	},
	getCallback(pathname, method) {
		let callbacks;
		if (pathname.endsWith("/")) {
			callbacks = this.callbacks.get(pathname) || this.callbacks.get(pathname.slice(0, -1));
		} else {
			callbacks = this.callbacks.get(pathname) || this.callbacks.get(pathname + "/");
		}
		if (!callbacks) {
			return {code: 404, callback: null};
		}

		let callback = callbacks[method];
		if (callback) {
			return {code: 200, callback};
		} else {
			return {code: 405, callback: null};
		}
	},
};


// static files

const CONTENT_TYPES = Object.freeze({
	"other": "application/octet-stream",
	".txt": "text/plain",
	".html": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".jpg": "image/jpeg",
	".png": "image/png",
});

async function getFile(pathname) {
	if (pathname.endsWith("/")) {
		pathname += "index.html";
	}

	let pathObject = path.parse(pathname);
	let filePath = path.join(__dirname, "static", path.format(pathObject));
	let contentType = CONTENT_TYPES[pathObject.ext.toLowerCase()] || CONTENT_TYPES.other;

	let result = await fs.readFile(filePath)
		.then(file => ({code: 200, contentType, file}))
		.catch(async err => {
			switch (err.code) {
				case "EISDIR":
					return await getFile(pathname + "/");
				case "ENOENT":
					return {code: 404, contentType, file: null};
				default:
					return {code: 500, contentType, file: null};
			}
		});
	return result;
}


// session

const {randomUUID} = require("crypto");

const sessions = new Map();

function createSession() {
	let sessionId = randomUUID();
	let sessionData = {};
	while (sessions.has(sessionId)) {
		sessionId = randomUUID();
	}

	sessions.set(sessionId, sessionData);
	return {sessionId, sessionData};
}

function getSession(sessionId) {
	let sessionData = sessions.get(sessionId);

	if (sessionData) {
		return {sessionId, sessionData};
	} else {
		return createSession();
	}
}


// process requests

server.on("request", async (req, res) => {
	const {pathname, query} = url.parse(req.url, true);
	req.query = query;
	req.cookies = parseCookie(req.headers.cookie);

	res.render = async (name, data) => {
		res.setHeader("content-type", "text/html");
		res.write(await viewer.render(name, data));
		res.end();
	};

	res.redirect = (location, permanent = false) => {
		res.setHeader("location", location);
		res.writeHead(permanent? 301: 302, "redirect!");
		res.end();
	}

	let {sessionId, sessionData} = getSession(req.cookies.session);
	req.sessionId = sessionId;
	req.session = sessionData;
	res.setHeader("set-cookie", `session=${sessionId};max-age=3600`);

	let {code, callback} = router.getCallback(pathname, req.method);
	if (code === 200) {
		return callback(req, res);
	}

	if (req.method === "GET") {
		let {code, contentType, file} = await getFile(pathname);
		if (code === 200) {
			res.setHeader("conent-type", contentType);
			res.writeHead(200);
			res.write(file);
			return res.end();
		} else if (code === 500) {
			res.setHeader("content-type", "text/plain");
			res.writeHead(500, "something went wrong..");
			res.write("500 something went wrong..");
			return res.end();
		}
	}

	if (code === 404) {
		res.writeHead(404, "no dragons here", {"content-type": "text/plain"});
		res.write("404 no dragons here");
		return res.end();
	} else if (code === 405) {
		res.writeHead(405, "method not allowed", {"content-type": "text/plain"});
		res.write("405 dragons here but method not allowed");
		return res.end();
	}
});


// utility functions

function parseCookie(cookie) {
	if (!cookie) return {};

	let strings = cookie.split(";");
	let arrays = strings.map(string => {
		let index = string.indexOf("=");
		if (!~index) return [string.trim(), null];

		let key = string.substring(0, index).trim();
		let value = string.substring(index + 1).trim();
		return [key, value];
	});

	let object = {};
	arrays.forEach(array => {
		object[array[0]] = array[1];
	});

	return object;
}


// export
module.exports = {
	get: router.get.bind(router),
	post: router.post.bind(router),
	listen: server.listen.bind(server),
};
