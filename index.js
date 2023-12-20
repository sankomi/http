const http = require("http");
const url = require("url");
const port = process.env.PORT || 3000;
const server = http.createServer();

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
					messages.push("here is a dragon cookie!");
					res.setHeader("set-cookie", "cookie=dragonCookie;max-age=10");
				}
			} else {
				messages.push("hi!");
			}

			res.writeHead(200);

			let write = messages.map(string => `dragon: ${string}`).join("\n");
			res.write("dragons!\n\n" + write);
			return res.end();
		}
	}
	res.writeHead(404, "no dragons here", {"content-type": "text/plain"});
	res.write("404 no dragons here");
	res.end();
});

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
