/**
 * @global
 */
class SocketConnection {

	/**
	 * @param {[type]} io
	 * @param {[type]} socket
	 * @param {[type]} chat
	 */
	constructor(io, socket, chat) {
		this._io = io
		this._socket = socket
		this._chat = chat
	}

	register(eventListener) {
		this.socket.on(eventListener.eventName, eventListener.instance[eventListener.eventName].bind(this))
	}

	/**
	 * @readonly
	 * @type {[type]}}
	 */
	get io() {
		return this._io
	}

	/**
	 * @readonly
	 * @type {[type]}}
	 */
	get socket() {
		return this._socket
	}

	/**
	 * @readonly
	 * @type {type}
	 */
	get chat() {
		return this._chat
	}

}

export default SocketConnection
