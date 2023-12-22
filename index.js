const http = require("http");
const url = require("url");
const port = process.env.PORT || 3000;
const server = http.createServer();

let cookiesGiven = 0;
let presentsReceived = 0;

server.on("request", (req, res) => {
	const {pathname, query} = url.parse(req.url, true);
	const cookies = parseCookie(req.headers.cookie);

	if (pathname === "/") {
		if (req.method === "GET") {
			res.setHeader("content-type", "text/plain");

			let messages = [];
			if ("cookie" in query) {
				messages.push("cookie?");
				if (cookies.cookie) {
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
		} else if (req.method === "POST") {
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
		}
	} else if (pathname === "/stats") {
		if (req.method === "GET") {
			let data = {cookiesGiven, presentsReceived};
			let contentType = null;
			let body = null;

			if ("csv" in query) {
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
		}
	}
	res.writeHead(404, "no dragons here", {"content-type": "text/plain"});
	res.write("404 no dragons here");
	res.end();
});

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

server.listen(port, () => console.log(`listening on ${port}`));
