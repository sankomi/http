const http = require("http");
const url = require("url");
const port = process.env.PORT || 3000;
const server = http.createServer();


// initialise stats

let cookiesGiven = 0;
let presentsReceived = 0;


// router object

let router = {
	callbacks: new Map(),
	get(pathname, callback) {
		this.addCallback("GET", pathname, callback);
	},
	post(pathname, callback) {
		this.addCallback("POST", pathname, callback)
	},
	addCallback(method, pathname, callback) {
		if (this.callbacks.has(pathname)) {
			this.callbacks.get(pathname)[method] = callback;
		} else {
			this.callbacks.set(pathname, {[method]: callback});
		}
	},
};


// process requests

server.on("request", (req, res) => {
	const {pathname, query} = url.parse(req.url, true);
	req.query = query;
	req.cookies = parseCookie(req.headers.cookie);

	let callback = router.callbacks.get(pathname);
	if (!callback) {
		res.writeHead(404, "no dragons here", {"content-type": "text/plain"});
		res.write("404 no dragons here");
		return res.end();
	}

	let methodCallback = callback[req.method];
	if (!methodCallback) {
		res.writeHead(404, "method not allowed", {"content-type": "text/plain"});
		res.write("405 dragons here but method not allowed");
		return res.end();
	}

	methodCallback(req, res);
});


// set routes

router.get("/", (req, res) => {
	res.setHeader("content-type", "text/plain");

	let messages = [];
	if ("cookie" in req.query) {
		messages.push("cookie?");
		if (req.cookies.cookie) {
			messages.push("you have a cookie already..");
		} else {
			cookiesGiven++;
			messages.push("here is a dragon cookie!");
			res.setHeader("set-cookie", "cookie=dragonCookie;max-age=10");
		}
	} else {
		messages.push("hi!");
	}

	res.writeHead(200);

	res.write(say(messages));
	return res.end();
});

router.post("/", (req, res) => {
	let body = "";
	let messages = ["post!"];
	req.on("data", data => body += data);
	req.on("end", () => {
		try {
			let json = JSON.parse(body);
			let presents = json.presents;

			if (typeof presents === "number" && presents > 0) {
				res.setHeader("content-type", "text/plain");
				res.writeHead(200);

				presentsReceived += presents;
				if (presents === 1) {
					messages.push("present! thank you!");
				} else {
					messages.push("presents! thank you!");
				}
				res.write(say(messages));
				res.end();
			} else {
				res.setHeader("content-type", "text/plain");
				res.writeHead(400, "no presents");

				messages.push("no presents?");
				res.write(say(messages));
				res.end();
			}
		} catch (err) {
			res.setHeader("content-type", "text/plain");
			res.writeHead(400, "what is this?");

			messages.push("what is this?");
			res.write(say(messages));
			res.end();
		}
	});
	return;
});

router.get("/stats", (req, res) => {
	let data = {cookiesGiven, presentsReceived};
	let contentType = null;
	let body = null;

	if ("csv" in req.query) {
		contentType = "text/csv";
		res.setHeader("content-disposition", "attachment;filename=stats.csv");

		let array = [["stat", "value"], ...Object.entries(data)];
		array = array.map(kv => {
			let key = "\"" + String(kv[0]).replaceAll("\"", "\"\"") + "\"";
			let value = "\"" + String(kv[1]).replaceAll("\"", "\"\"") + "\"";
			return key + "," + value;
		});
		body = array.join("\n");
	} else {
		contentType = "application/json";
		body = JSON.stringify(data);
	}

	res.setHeader("content-type", contentType);
	res.writeHead(200);
	res.write(body);
	return res.end();
});


// utility functions

function say(messages) {
	let write = messages.map(string => `dragon: ${string}`).join("\n");
	return "dragons!\n\n" + write;
}

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


// start listening

server.listen(port, () => console.log(`listening on ${port}`));
