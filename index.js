const server = require("./server");
const port = process.env.PORT || 3000;


// initialise stats

let cookiesGiven = 0;
let presentsReceived = 0;


// set routes

let router = server.Router();
router.get("/", (req, res) => {
	res.setHeader("content-type", "text/plain");
	res.writeHead(200);
	res.write(say(["router!"]));
	res.end();
});

let anotherRouter = server.Router();
anotherRouter.get("/", (req, res) => {
	res.setHeader("content-type", "text/plain");
	res.writeHead(200);
	res.write(say(["another router!"]));
	res.end();
});

router.use("/another", anotherRouter);
server.use("/router", router);

server.use("/", (req, res, next) => {
	if (req.method === "GET") {
		let viewCount = req.session.viewCount || 0;
		req.session.viewCount = ++viewCount;
	}
	next();
});

server.get("/", (req, res) => {
	res.setHeader("content-type", "text/plain");
	res.statusCode = 200;

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

	if ("html" in req.query) {
		res.render("page", sayData(messages));
	} else {
		res.writeHead(200);
		res.write(say(messages));
		res.end();
	}
});

server.post("/", (req, res) => {
	let body = "";
	let messages = ["post!"];
	req.on("data", data => body += data);
	req.on("end", () => {
		try {
			let json = JSON.parse(body);
			let presents = json.presents;

			if (typeof presents === "number" && presents > 0) {
				res.statusCode = 200;

				presentsReceived += presents;
				if (presents === 1) {
					messages.push("present! thank you!");
				} else {
					messages.push("presents! thank you!");
				}

				if ("html" in req.query) {
					res.render("page", sayData(messages));
				} else {
					res.setHeader("content-type", "text/plain");
					res.write(say(messages));
					res.end();
				}
			} else {
				res.statusCode = 400;
				res.statusMessage = "no presents?";
				messages.push("no presents?");

				if ("html" in req.query) {
					res.render("page", sayData(messages));
				} else {
					res.setHeader("content-type", "text/plain");
					res.write(say(messages));
					res.end();
				}
			}
		} catch (err) {
			res.statusCode = 400;
			res.statusMessage = "what is this?";
			messages.push("what is this?");

			if ("html" in req.query) {
				res.render("page", sayData(messages));
			} else {
				res.setHeader("content-type", "text/plain");
				res.write(say(messages));
				res.end();
			}
		}
	});
	return;
});

server.get("/stats", (req, res) => {
	let viewCount = req.session.viewCount || 0;
	let data = {cookiesGiven, presentsReceived, viewCount};
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

server.get("/mimic/:as/:quote", (req, res) => {
	let as = req.param.as;
	let quote = req.param.quote;

	res.setHeader("content-type", "text/plain");
	res.writeHead(200);
	res.write(say([quote], as));
	res.end();
});

server.get("/lucky", (req, res) => {
	if (Math.random() > 0.5) {
		return res.redirect("/win");
	} else {
		return res.redirect("/lose");
	}
});

server.get("/win", (req, res) => {
	res.writeHead(200);
	res.write(say(["you win!"]));
	res.end();
});

server.get("/lose", (req, res) => {
	res.writeHead(200);
	res.write(say(["you lose!"]));
	res.end();
});

server.get("/moved", (req, res) => {
	res.redirect("/", true);
});

server.get("/html", async (req, res) => {
	return res.render("page", {title: "title", content: "content"});
});


// utility functions

function say(messages, as = "dragon") {
	let write = messages.map(string => `${as}: ${string}`).join("\n");
	return "dragons!\n\n" + write;
}

function sayData(messages, as = "dragon") {
	return {
		title: "dragons!",
		content: messages.map(string => `${as}: ${string}`).join("\n"),
	};
}


// start listening

server.listen(port, () => console.log(`listening on ${port}`));
