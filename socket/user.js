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
		this.chat.user.nickname = nickname
	}

	/**
	 * @param {string} nickname
	 */
	userRename(nickname) {
		if(typeof nickname !== "string") {
			return
		}
		const userChannels = this.chat.channels.filter(channel => channel.users.includes(this.socket.id) === true)
		const chars = [...nickname]
		const invalidNickMessage = {
			source: "---", time: new Date().getTime(),
			message: `"${nickname}" is not a valid nickname.`,
		}
		for(const char of chars) {
			if(Chat.ALLOWED_CHARACTERS_NICKNAME.includes(char.toLowerCase()) === false) {
				this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { message: invalidNickMessage })
				return
			}
		}
		if (nickname.length < 3 || nickname.length > 15) {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { message: invalidNickMessage })
		} else {
			this.socket.emit(Chat.EVENT.USER_RENAME, nickname)
			const message = {
				source: "---", time: new Date().getTime(),
				message: `${this.chat.user.nickname} has renamed to ${nickname}`,
			}
			this.chat.user.nickname = nickname
			for (const channel of userChannels) {
				this.io.in(channel.name).emit(Chat.EVENT.USER_RENAMED, { nickname, userId: this.socket.id, users: this.chat.users })
				this.io.in(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message})
				channel.messages.push(message)
			}
		}
	}

	/**
	 * @param {object} data
	 * @param {string} data.channelName
	 * @param {string} data.nickname
	 * @param {string} data.message
	 */
	userMessage(data) {
		if(typeof data !== "object") {
			return
		}
		const { channelName, nickname, message } = data
		if(typeof channelName !== "string" || typeof nickname !== "string" || typeof message !== "string") {
			return
		}
		if(message.length === 0 || message.length > Chat.MAXIMUM_MESSAGE_LENGTH) {
			return
		}
		const channel = this.chat.channels.find(channel => channel.name === channelName)
		const user = channel.users.map(userId => this.chat.users.find(user => user.id === userId)).find(user => user.nickname === nickname)
		if(typeof user === "undefined") {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, {
				message: {
					source: "---", time: new Date().getTime(),
					message: `Target of PM was not found in this channel.`,
				}
			})
		} else {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, {
				message: {
					source: "---", time: new Date().getTime(),
					message: `To ${nickname}: ${message}`,
				}
			} )
			this.io.to(user.id).emit(Chat.EVENT.CHANNEL_MESSAGE, {
				message: {
					source: "---", time: new Date().getTime(),
					message: `From ${this.chat.user.nickname}: ${message}`,
				}
			})
		}
	}
}

export default UserEventListener
