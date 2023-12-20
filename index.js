const http = require("http");
const port = process.env.PORT || 3000;
const server = http.createServer();

server.on("request", (req, res) => {
	if (req.url === "/") {
		if (req.method === "GET") {
			res.setHeader("content-type", "text/plain");
			res.writeHead(200);
			res.write("dragons!");
			return res.end();
		}
	}
	res.writeHead(404, "no dragons here", {"content-type": "text/plain"});
	res.write("404 no dragons here");
	res.end();
});

server.listen(port, () => console.log(`listening on ${port}`));
