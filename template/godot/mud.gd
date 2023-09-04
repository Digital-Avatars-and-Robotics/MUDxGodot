extends Node

# these objects have to be global
var mud
var mudCounterUpdated

func _ready():
	# mud variable is now window.mud object from js 
	mud = JavaScriptBridge.get_interface("mud")
	
	mudCounterUpdated = JavaScriptBridge.create_callback(counter_updated)
	# Godot overwrites window.mud.counterupdated() function in js 
	# with js callback created above
	mud.counter_updated = mudCounterUpdated
	
	mud.setup()
	mud.mountDevTools()

func counter_updated(update: Array):
	get_node("/root/Control/Label").text = str(update[0].value[0].value)
