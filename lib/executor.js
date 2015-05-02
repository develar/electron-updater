
function exec(execPath, args, callback) {

	console.log('executing...')
	callback()
}

module.exports = {
	exec: exec
}