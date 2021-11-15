import Chat from "../src/chat.js"
import SocketListener from "../src/socket-listener.js"

/**
 * @global
 */
class SocketIOEventListener extends SocketListener {

	async disconnect() {
		console.log("disconnect " + this.socket.id)
		const collection = this.chat.database.collection("channels")
		const userChannels = await collection.find({ users: { $elemMatch: { socketId: this.socket.id }} }).toArray()
		await collection.updateMany({}, { $pull : { "users" : { "socketId": this.socket.id } } })
		for (const channel of userChannels) {
			const message = {
				source: "---",
				date: new Date(),
				content: `${this.data.nickname} has left ${channel.name}`,
			}
			this.socket.broadcast.to(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, {
				source: "---",
				date: new Date(),
				channel,
				message
			})
			await collection.updateOne(
				{ _id : channel._id },
				{ $push : { "messages" : message } }
			)
			this.socket.broadcast.to(channel.name).emit(Chat.EVENT.CHANNEL_USER_LEFT, { socketId: this.socket.id })
		}
	}

}

export default SocketIOEventListener
