import Chat from "../src/chat.js"
import SocketListener from "../src/socket-listener.js"

/**
 * @global
 */
class UserEventListener extends SocketListener {

	/**
	 * @param {string} nickname
	 */
	userNicknameSet(nickname) {
		if(typeof nickname !== "string") {
			return
		}
		this.data.nickname = nickname
	}

	/**
	 * @param {string} nickname
	 */
	async userRename(nickname) {
		if(typeof nickname !== "string") {
			return
		}
		const collection = this.chat.database.collection("channels")
		const characters = [ ...nickname ]
		const invalidNickMessage = {
			source: "---",
			date: new Date(),
			content: `"${nickname}" is not a valid nickname.`,
		}
		for(const character of characters) {
			if(Chat.ALLOWED_CHARACTERS_NICKNAME.includes(character.toLowerCase()) === false) {
				this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { content: invalidNickMessage })
				return
			}
		}
		if (nickname.length < 3 || nickname.length > 15) {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { content: invalidNickMessage })
		} else {
			this.socket.emit(Chat.EVENT.USER_RENAME, nickname)
			const message = {
				source: "---",
				date: new Date(),
				content: `${this.data.nickname} has renamed to ${nickname}`,
			}
			this.data.nickname = nickname
			const userChannels = await collection.find({ users: { socketId: this.socket.id } }).toArray()
			for (const channel of userChannels) {
				this.io.in(channel.name).emit(Chat.EVENT.USER_RENAMED, { nickname, socketId: this.socket.id })
				this.io.in(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: channel.name, message })
				await collection.updateOne(
					{ _id : channel._id },
					{ $push : { "messages" : message } }
				)
			}
		}
	}

}

export default UserEventListener
