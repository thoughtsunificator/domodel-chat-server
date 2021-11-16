import fs from "fs"
import http from "http"
import express from "express"
import { RateLimiterMemory } from "rate-limiter-flexible"
import { Server } from "socket.io"
import MongoDB from "mongodb"
import config from "@thoughtsunificator/config-env"

import Chat from "./src/chat.js"
import SocketConnection from "./src/socket-connection.js"

const client = await MongoDB.MongoClient.connect(config.DATABASE_URL, { useUnifiedTopology: true })
const database = client.db(config.DATABASE_NAME)
const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
	cors: {
		origin: config.FRONT_URL,
		methods: ["GET", "POST"]
	}
})
const chat = new Chat(database)
const rateLimiter = new RateLimiterMemory({
	points: 10,
	duration: 2,
})
const eventListeners = []

async function rateLimiterMiddleware(socket, next) {
	try {
		await rateLimiter.consume(socket.handshake.address)
		next()
	} catch(exception) {
		console.error(exception)
	}
}

await database.collection("channels").updateMany({}, { $set: { users: [] } })

for(const file of fs.readdirSync("./socket/")) {
	const eventListener = new ((await import(`./socket/${file}`)).default)
	for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(eventListener)).filter(name => name !== "constructor" && typeof eventListener[name] === "function")) {
		eventListeners.push({ eventName: name, instance: eventListener })
	}
}

app.get("*", function(req, res) {
	res.redirect(config.FRONT_URL)
})

io.use(rateLimiterMiddleware)

io.on("connection", async socket => {

	console.log("connection " + socket.id)

	socket.use((packet, next) => rateLimiterMiddleware(socket, next))

	const socketConnection = new SocketConnection(io, socket, chat)
	socketConnection.data.nickname = Chat.DEFAULT_NICKNAME

	for(const eventListener of eventListeners) {
		socketConnection.register(eventListener)
	}

	socket.emit(Chat.EVENT.NETWORK_MESSAGE, {
		message: {
			source: "---",
			date: new Date(),
			content: `Welcome to ${config.CHAT_NAME} ! ${io.engine.clientsCount} user(s) online. You might want to join #general or #help`,
		}
	})

})

httpServer.listen(config.PORT, () => {
	console.log("Server listening at port %d", config.PORT)
})
