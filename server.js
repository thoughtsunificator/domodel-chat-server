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

const chat = new Chat(io, database)

const rateLimiter = new RateLimiterMemory({
	points: 5,
	duration: 2,
})

const eventListeners = []

const files = fs.readdirSync("./socket/")

for(const file of files) {
	const eventListener = new ((await import(`./socket/${file}`)).default)
	for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(eventListener)).filter(name => name !== "constructor" && typeof eventListener[name] === "function")) {
		eventListeners.push({ eventName: name, instance: eventListener })
	}
}

app.get("*", function(req, res) {
	res.redirect(config.FRONT_URL)
})

io.use((async (socket, next) => {
	try {
		await rateLimiter.consume(socket.handshake.address)
		next()
	} catch(exception) {
		console.error(exception)
	}
}))

io.on("connection", async socket => {

	console.log("connection " + socket.id)

	socket.use((async (packet, next) => {
		try {
			await rateLimiter.consume(socket.handshake.address)
			next()
		} catch(exception) {
			console.error(exception)
		}
	}))

	chat.user = chat.addUser({ nickname: Chat.DEFAULT_NICKNAME, id: socket.id })

	const socketConnection = new SocketConnection(io, socket, chat)

	for(const eventListener of eventListeners) {
		socketConnection.register(eventListener)
	}

	socket.emit(Chat.EVENT.CHANNEL_MESSAGE, {
		message: {
			source: "---", time: new Date().getTime(),
			message: `Welcome to domodel-socket-chat ! ${chat.users.length} user(s) online. You might want to join #general or #help`,
		}
	})

})

httpServer.listen(config.PORT, () => {
	console.log("Server listening at port %d", config.PORT)
})
