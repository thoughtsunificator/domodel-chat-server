import Chat from "../src/chat.js"
import SocketListener from "../src/socket-listener.js"

/**
 * @global
 */
class SocketIOEventListener extends SocketListener {

	disconnect() {
		console.log("disconnect " + this.socket.id)
		const index = this.chat.users.findIndex(user => user.id === this.socket.id)
		this.chat.users.splice(index, 1)
		const userChannels = this.chat.channels.filter(channel => channel.users.includes(this.socket.id) === true)
		for(const channel of userChannels) {
			channel.users.splice(channel.users.indexOf(this.socket.id), 1)
			const message = {
				source: "---", time: new Date().getTime(),
				message: `${this.chat.user.nickname} has left ${channel.name}`,
			}
			this.socket.broadcast.to(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, {
				source: "---", time: new Date().getTime(),
				channel,
				message
			})
			channel.messages.push(message)
			this.socket.broadcast.to(channel.name).emit(Chat.EVENT.USER_LEFT, { channel, userId: this.socket.id, users: this.chat.users })
		}
	}

}

export default SocketIOEventListener
