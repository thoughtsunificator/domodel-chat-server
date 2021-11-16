import Chat from "../src/chat.js"
import SocketListener from "../src/socket-listener.js"

/**
 * @global
 */
class UserEventListener extends SocketListener {

	/**
	 * @param {string} nickname
	 */
	async userRename(nickname) {
		if(typeof nickname !== "string" || nickname === this.data.nickname) {
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
				this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message: invalidNickMessage })
				return
			}
		}
		if (nickname.length < 3 || nickname.length > 15) {
			this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message: invalidNickMessage })
		} else {
			const userChannels = await collection.find({ users: { $elemMatch: { socketId: this.socket.id }} }).toArray()
			let used = false
			for (const channel of userChannels) {
				const nicknames = channel.users.filter(user => user.socketId !== this.socket.id).map(user => user.nickname)
				if(nicknames.includes(nickname)) {
					used = true
					break
				}
			}
			if(used) {
				this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message: {
						source: "---",
						date: new Date(),
						content: `"${nickname}" is already taken.`,
					}
				})
			} else {
				this.socket.emit(Chat.EVENT.USER_RENAME, nickname)
				const message = {
					source: "---",
					date: new Date(),
					content: `${this.data.nickname} has renamed to ${nickname}`,
				}
				this.data.nickname = nickname
				await collection.updateMany({}, { "$set": { "users.$[elem].nickname": nickname } }, { "arrayFilters": [{ "elem.socketId": this.socketId }], "multi": true })
				this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message })
				for (const channel of userChannels) {
					this.io.in(channel.name).emit(Chat.EVENT.USER_RENAMED, { nickname, socketId: this.socket.id })
					this.io.in(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: channel.name, message })
				}
			}
		}
	}

}

export default UserEventListener
