# MUD x Godot

Easy way to connect MUD autonomous worlds engine with Godot. This project works with Web only.

## TL;DR
We are wraping MUD functions in class, compiling MUD client package to mudule and connecting it
to Godot using [JavaScriptBridge](https://docs.godotengine.org/en/latest/classes/class_javascriptbridge.html)

## Prerequisites

 - [MUD](https://mud.dev/quick-start)
 - [GODOT](https://godotengine.org/) (Using 4.1 for this tutorial but 3.5 works as well with few changes in function names)

## Steps

### Creating MUD project
To start, create your MUD project from a template by running
the following pnpm command. Choose vanilla template when asked. 

```bash
pnpm create mud@next *my-project*
```

Template MUD project is a simple counter example that we will use to demonstrate how we can call functions and receive
information from MUD in Godot.

Make sure to run following command at least once.
If it succeeds, you can close it.

```bash
cd *my-project*
pnpm install
pnpm run dev
```

### Compile MUD client package into a module

In our MUD project navigate to directory *mud_project_path*/packages/client.
There is a need to change a few files there.

We need to tell vite to bundle project into a module.

Replace content in vite.config.ts with this code:
```js
import { defineConfig } from "vite";
import { resolve } from 'path'

export default defineConfig({
    build: {
        lib: {
          entry: resolve(__dirname, './src/index.ts'),
          name: 'mud',
          fileName: 'mud-lib',
        },
        rollupOptions: {
          external: ['vue'],
          output: {
            globals: {
              vue: 'Vue',
            },
          },
        },
  },
})
```

in package.json add entry point for library
```json
{
    ...
    "main": "./src/index.ts",
    ...
}
```

#### Make interface that Godot can access

In *mud_project_path*/packages/client/src open index.ts file.

We want to create class that wraps function calls to MUD and calls functions
that we will later connect to Godot on MUD updates.

exaple of index.ts
```typescript
import { setup } from "./mud/setup";
import mudConfig from "contracts/mud.config";
import { mount as mountDevTools } from "@latticexyz/dev-tools";

class MudWrap{
  increment: any

  async setup() {
    const {
      components,
      systemCalls: { increment },
      network,
    } = await setup();
    this.increment = increment
    mountDevTools({
      config: mudConfig,
      publicClient: network.publicClient,
      walletClient: network.walletClient,
      latestBlock$: network.latestBlock$,
      blockStorageOperations$: network.blockStorageOperations$,
      worldAddress: network.worldContract.address,
      worldAbi: network.worldContract.abi,
      write$: network.write$,
      recsWorld: network.world,
    });

    // Components expose a stream that triggers when the component is updated.
    components.Counter.update$.subscribe((update) => {
      console.log("Counter updated", update)
      this.counter_updated(update)
    });
  }

  async increment() {
    console.log("new counter value:", await this.increment());
  };

  // To be overwritten by Godot callback
  counter_updated(update: any) {/**/}

}

(window as any).mud = new MudWrap()
```

Godot can get access to anything that is mounted to *window* interface of a browser.

I didn't put MUD setup in constructor, because this code would be called
before Godot project loads and we would not be able to handle events properly.

Finally we can build our project. Run this command in *mud_project_path*/packages/client directory:
```bash
pnpm run build
```

### Godot export setup
Create a new godot project create *build* folder inside of it.

Click Project -> Export and add Web export preset.

Set export path to *godot_project_path*/build/index.html

We can now copy compiled module from
*mud_project_path*/packages/client/dist to
*godot_project_path*/build/mud-lib

In Godot export options add HTML headers

```html
<script crossorigin="anonymous" type="module" src="mud-lib/mud-lib.js"></script>
<script>
  var process = {env : {NODE_ENV: "DEV" }}
</script>
```

### Creating Godot interface for MUD

Create new script in Godot called mud.gd and paste this code

```gdscript
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

# JavaScript callbacks in godot always put arguments in array
func counter_updated(update: Array):
	get_node("/root/Control/Label").text = str(update[0].value[0].value)
```

Navigate to Project -> Project Settings -> Autoload and add newly created script.
![godot autoload](/imgs/autoload.png)

### UI

Create new User Interface Scene and add 2 child nodes - Button and Label.
You can change text of the Label to "Increment". Place them how you like in 2D editor.

your tree should look like this

![godot tree](/imgs/godot_tree.png)

Right click on scene in file expoler in Godot and set it as main scene.

Attach new script to Control and add to it "button_up" signal from Button. Add following code:

```gdscript
extends Control

func _on_button_button_up():
	Mud.mud.increment()
```

### Serve

Run MUD project from root direcory with this command:
```bash
pnpm run dev
```

Export Godot project.

To run our web app you can use python script supplied in Tip
section of [Godot manual](https://docs.godotengine.org/en/latest/tutorials/export/exporting_for_web.html#serving-the-files).
Paste it in build directory and run it.
> **_NOTE_**: If you are using *windows* you might have to add bind parameter to test function in line 35:
> ```python
> test(CORSRequestHandler, HTTPServer, port=port, bind="127.0.0.1")
> ```

You might have to disable CORS policy with some browser plugin.

Done!
