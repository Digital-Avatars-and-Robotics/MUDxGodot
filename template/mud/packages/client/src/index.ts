import { setup } from "./mud/setup";
import mudConfig from "contracts/mud.config";
import { mount as mountDevTools } from "@latticexyz/dev-tools";

class MudLib{
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

(window as any).mud = new MudLib()
