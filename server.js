// Setup basic express server
const express = require("express")
const app = express()
const path = require("path")
const server = require("http").createServer(app)
const { RateLimiterMemory } = require('rate-limiter-flexible')
const io = require("socket.io")(server)

const PORT = process.env.PORT || 3001
const ALLOWED_CHARACTERS_NICKNAME = [..."abcdefghijklmnopqrstuvwxyz1234567890-_"]
const ALLOWED_CHARACTERS_CHANNEL = [..."abcdefghijklmnopqrstuvwxyz1234567890"]

const _users = [] // TODO there must be a better way to persist data in-memory
const _channels = [ // TODO there must be a better way to persist data in-memory
	{
		owner: null,
		topic: "Some random topic",
		name: "#Programming",
		messages: [],
		users: [] // only stores id
	},
	{
		owner: null,
		topic: "Hello",
		name: "#Music",
		messages: [],
		users: []
	},
	{
		owner: null,
		topic: "Welcome",
		name: "#Videos",
		messages: [],
		users: []
	}
]

const rateLimiter = new RateLimiterMemory({
	points: 5,
	duration: 2,
})


server.listen(PORT, () => {
	console.log("Server listening at port %d", PORT)
})

io.use(async (socket, next) => {
	try {
		await rateLimiter.consume(socket.handshake.address)
		next()
	} catch(rejRes) {
		socket.emit('blocked', { 'retry-ms': rejRes.msBeforeNext })
	}
})

io.on("connection", socket => {

	console.log("connection " + socket.id)

	socket.use(async (packet, next) => {
		try {
			await rateLimiter.consume(socket.handshake.address)
			next()
		} catch(rejRes) {
			socket.emit('blocked', { 'retry-ms': rejRes.msBeforeNext })
		}
	})

	const currentUser = { nickname: "Anon", id: socket.id }

	_users.push(currentUser)

	socket.emit("message send", {
		message: {
			source: "---", time: new Date().getTime(),
			message: `Welcome to domodel-socket-chat ! ${_users.length} user(s) online.`,
		}
	})

	socket.on("channel list", query => {
		if(query !== null) {
			socket.emit("channel list", _channels.filter(channel => channel.name.toLowerCase().includes(query.toLowerCase())))
		} else {
			socket.emit("channel list", _channels)
		}
	})

	socket.on("user nickname", nickname => {
		currentUser.nickname = nickname
	})

	socket.on("channel join", name => {
		const chars = [...name]
		const invalidChannelNameMessage = {
			source: "---", time: new Date().getTime(),
			message: `"${name}": :Illegal channel name.`,
		}
		if(name.trim().length === 0 || chars.length < 3) {
			socket.emit("message send", { message: invalidChannelNameMessage })
			return
		} else if(chars[0] !== "#") {
			socket.emit("message send", { message: invalidChannelNameMessage })
			return
		}
		for(const char of chars.slice(1)) {
			if(ALLOWED_CHARACTERS_CHANNEL.includes(char.toLowerCase()) === false) {
					socket.emit("message send", { message: invalidChannelNameMessage })
					return
			}
		}
		let channel = _channels.find(channel => channel.name === name)
		// TODO check if nick is already taken...
		if (typeof channel !== "undefined") {
			const channelUsers = channel.users.map(userId => _users.find(user => user.id === userId))
			const nicknames = channelUsers.map(user => user.nickname)
			const renamed = nicknames.includes(currentUser.nickname)
			let nickname = currentUser.nickname
			while (nicknames.includes(nickname)) {
				nickname += "_"
			}
			if (renamed === true) {
				socket.emit("nickname set", nickname)
				const message = {
					message: `${currentUser.nickname} has renamed to ${nickname}`,
					source: "---", time: new Date().getTime(),
				}
				const userChannels = _channels.filter(channel => channel.users.includes(socket.id) === true)
				currentUser.nickname = nickname
				for (const channel of userChannels) {
					io.in(channel.name).emit("user renamed", { channel, nickname, userId: socket.id, users: _users })
					io.in(channel.name).emit("message send", { channel, message })
					channel.messages.push(message)
				}
			}
			channel.users.push(socket.id)
		} else {
			channel = {
				owner: socket.id,
				topic: "Topic not set. Use /topic to change the topic.",
				name,
				users: [socket.id],
				messages: []
			}
			_channels.push(channel)
		}
		const message = { source: "---", time: new Date().getTime(), message: `${currentUser.nickname} has joined ${name}`, }
		socket.join(name)
		socket.emit("channel join", { channel, users: _users, nickname: currentUser.nickname})
		socket.emit("message send", { channel, message: { source: "---", time: new Date().getTime(), message: `You are now talking on ${name}`, } })
		socket.broadcast.to(name).emit("user joined", { channel, user: currentUser, users: _users})
		socket.broadcast.to(name).emit("message send", { channel, message })
		channel.messages.push(message)
	})

	socket.on("channel reconnect", name => {
		console.log(`reconnecting to ${name} (${socket.id})`)
		let channel = _channels.find(channel => channel.name === name)
		if (typeof channel !== "undefined") {
			const channelUsers = channel.users.map(userId => _users.find(user => user.id === userId))
			const nicknames = channelUsers.map(user => user.nickname)
			const renamed = nicknames.includes(currentUser.nickname)
			let nickname = currentUser.nickname
			while (nicknames.includes(nickname)) {
				nickname += "_"
			}
			if (renamed === true) {
				socket.emit("nickname set", nickname)
				const message = {
					source: "---", time: new Date().getTime(),
					message: `${currentUser.nickname} has renamed to ${nickname}`,
				}
				const userChannels = _channels.filter(channel => channel.users.includes(socket.id) === true)
				currentUser.nickname = nickname
				for (const channel of userChannels) {
					io.in(channel.name).emit("user renamed", { channel, nickname, userId: socket.id, users: _users })
					io.in(channel.name).emit("message send", { channel, message })
					channel.messages.push(message)
				}
			}
			channel.users.push(socket.id)
		} else {
			channel = {
				owner: socket.id,
				topic: "Topic not set. Use /topic to change the topic.",
				name,
				users: [socket.id],
				messages: []
			}
			_channels.push(channel)
		}
		const message = {
			source: "---", time: new Date().getTime(),
			message: `${currentUser.nickname} has joined ${name}`
		}
		socket.join(name)
		socket.emit("channel reconnect", { channel, users: _users, nickname: currentUser.nickname})
		socket.emit("message send", { channel, message: { source: "---", time: new Date().getTime(), message: `You are now talking on ${name}`, } })
		socket.broadcast.to(name).emit("user joined", { channel, user: currentUser, users: _users })
		socket.broadcast.to(name).emit("message send", { channel, message })
		channel.messages.push(message)
	})

	socket.on("channel leave", name => {
		const channel = _channels.find(channel => channel.name === name)
		channel.users.splice(channel.users.indexOf(socket.id), 1)
		const message = {
			source: "---", time: new Date().getTime(),
			message: `${currentUser.nickname} has left ${name}`,
		}
		socket.leave(name)
		socket.emit("channel leave", channel)
		socket.broadcast.to(name).emit("message send", { channel, message })
		socket.broadcast.to(name).emit("user left", { channel, userId: socket.id, users: _users})
		channel.messages.push(message)
	})

	socket.on("channel disconnect", name => {
		const channel = _channels.find(channel => channel.name === name)
		channel.users.splice(channel.users.indexOf(socket.id), 1)
		const message = {
			message: `${currentUser.nickname} has left ${name}`,
			source: "---", time: new Date().getTime(),
		}
		socket.leave(name)
		socket.emit("message send", { channel, message: { source: "---", time: new Date().getTime(), message: ` You have left channel ${name}`, } })
		socket.emit("channel disconnect", channel)
		socket.broadcast.to(name).emit("message send", { channel, message })
		socket.broadcast.to(name).emit("user left", { channel, userId: socket.id, users: _users })
		channel.messages.push(message)
	})

	socket.on("channel topic", data => {
		const {topic, name} = data
		const channel =  _channels.find(channel => channel.name === name)
		if (channel.owner === socket.id) {
			channel.topic = topic
			io.in(name).emit("channel topic", data)
			const message = {
				source: "---", time: new Date().getTime(),
				message: `Topic was set to "${topic}"`,
			}
			io.in(name).emit("message send", { channel, message})
			channel.messages.push(message)
		} else {
			socket.emit("message send", {
				message: {
					source: "---", time: new Date().getTime(),
					message: `You are not the owner of ${name}`,
				}
			})
		}
	})

	socket.on("channel delete", name => {
		const channel =  _channels.find(channel => channel.name === name)
		if (typeof channel === "undefined") {
			socket.emit("message send", {
				message: {
					source: "---", time: new Date().getTime(),
					message: `${name} does not exist`,
				}
			})
		} else if(channel.owner === socket.id) {
			io.in(name).emit("channel leave", channel)
			socket.leave(name)
			_channels.splice(_channels.indexOf(channel), 1)
		} else {
			socket.emit("message send", {
				message: {
					source: "---", time: new Date().getTime(),
					message: `You are not the owner of ${name}`,
				}
			})
		}
	})

	socket.on("message send", data => {
		const { channelName, message } = data
		if(message.length === 0) {
			return
		}
		message.time = new Date().getTime()
		const channel = _channels.find(channel => channel.name === channelName)
		channel.messages.push(message)
		io.in(channelName).emit("message send", data)
	})

	socket.on("nickname set", nickname => {
		const userChannels = _channels.filter(channel => channel.users.includes(socket.id) === true)
		// check if nickname is valid
		const chars = [...nickname]
		const invalidNickMessage = {
			source: "---", time: new Date().getTime(),
			message: `"${nickname}" is not a valid nickname.`,
		}
		for(const char of chars) {
			if(ALLOWED_CHARACTERS_NICKNAME.includes(char.toLowerCase()) === false) {
				socket.emit("message send", {message: invalidNickMessage})
				return
			}
		}
		if (nickname.length < 3 || nickname.length > 15) {
			socket.emit("message send", {message: invalidNickMessage})
		} else {
			socket.emit("nickname set", nickname)
			const message = {
				source: "---", time: new Date().getTime(),
				message: `${currentUser.nickname} has renamed to ${nickname}`,
			}
			currentUser.nickname = nickname
			for (const channel of userChannels) {
				io.in(channel.name).emit("user renamed", { nickname, userId: socket.id, users: _users })
				io.in(channel.name).emit("message send", { channel, message})
				channel.messages.push(message)
			}
		}
	})

	socket.on("user message", data => {
		const {channelName, nickname, message } = data
		const channel = _channels.find(channel => channel.name === channelName)
		const user = channel.users.map(userId => _users.find(user => user.id === userId)).find(user => user.nickname === nickname)
		if(typeof user === "undefined") {
			socket.emit("message send", {
				message: {
					source: "---", time: new Date().getTime(),
					message: `Target of PM was not found in this channel.`,
				}
			})
		} else {
			socket.emit("message send", {
				message: {
					source: "---", time: new Date().getTime(),
					message: `To ${nickname}: ${message}`,
				}
			} )
			io.sockets.connected[user.id].emit("message send", {
				message: {
					source: "---", time: new Date().getTime(),
					message: `From ${currentUser.nickname}: ${message}`,
				}
			})
		}
	})

	socket.on("disconnect", () => {
		console.log("disconnect " + socket.id)
		const index = _users.findIndex(user => user.id === socket.id)
		_users.splice(index, 1)
		const userChannels = _channels.filter(channel => channel.users.includes(socket.id) === true)
		for(const channel of userChannels) {
			channel.users.splice(channel.users.indexOf(socket.id), 1)
			const message = {
				source: "---", time: new Date().getTime(),
				message: `${currentUser.nickname} has left ${channel.name}`,
			}
			socket.broadcast.to(channel.name).emit("message send",  {
				source: "---", time: new Date().getTime(),
				channel,
				message
			})
			channel.messages.push(message)
			socket.broadcast.to(channel.name).emit("user left", { channel, userId: socket.id, users: _users })
		}
	})

})
