import * as Tone from "tone";

export class EffectsChain {
  private chain: Tone.ToneAudioNode[] = [];

  build(effects: any[], destination: Tone.ToneAudioNode): void {
    this.clear();
    let current: Tone.ToneAudioNode = destination;
    const instances: (Tone.ToneAudioNode & { dispose: () => void })[] = [];

    for (const effect of effects) {
      if (!effect.enabled) continue;
      const instance = this.createEffect(effect);
      if (instance) {
        current.connect(instance);
        current = instance;
        instances.push(instance);
      }
    }

    current.connect(destination);
    this.chain = [destination, ...instances];
  }

  private createEffect(effect: any): (Tone.ToneAudioNode & { dispose: () => void }) | null {
    switch (effect.type) {
      case "reverb": {
        const reverb = new Tone.Reverb({ decay: effect.params.decay ?? 2, wet: effect.params.wet ?? 0.3 });
        reverb.generate();
        return reverb;
      }
      case "delay": {
        return new Tone.FeedbackDelay({
          delayTime: effect.params.delayTime ?? "8n",
          feedback: effect.params.feedback ?? 0.2,
          wet: effect.params.wet ?? 0.1,
        });
      }
      case "eq": {
        return new Tone.EQ3({
          low: effect.params.low ?? 0,
          mid: effect.params.mid ?? 0,
          high: effect.params.high ?? 0,
        });
      }
      case "compressor": {
        return new Tone.Compressor({
          threshold: effect.params.threshold ?? -24,
          ratio: effect.params.ratio ?? 4,
          attack: effect.params.attack ?? 0.003,
          release: effect.params.release ?? 0.25,
        });
      }
      case "filter": {
        return new Tone.Filter({
          frequency: effect.params.frequency ?? 800,
          type: effect.params.filterType ?? "lowpass",
          Q: effect.params.Q ?? 1,
        });
      }
      default:
        return null;
    }
  }

  clear(): void {
    this.chain.forEach((node) => {
      try {
        node.disconnect();
      } catch (e) {}
    });
    this.chain = [];
  }

  dispose(): void {
    this.clear();
  }
}
