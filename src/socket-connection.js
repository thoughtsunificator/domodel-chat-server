/**
 * @global
 */
class SocketConnection {

	/**
	 * @param {object} io
	 * @param {object} socket
	 * @param {object} chat
	 */
	constructor(io, socket, chat) {
		this._io = io
		this._socket = socket
		this._chat = chat
		this._data = {}
	}

	register(eventListener) {
		this.socket.on(eventListener.eventName, eventListener.instance[eventListener.eventName].bind(this))
	}

	/**
	 * @readonly
	 * @type {object}
	 */
	get io() {
		return this._io
	}

	/**
	 * @readonly
	 * @type {object}
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

	/**
	 * @readonly
	 * @type {object}
	 */
	get data() {
		return this._data
	}

}

export default SocketConnection
