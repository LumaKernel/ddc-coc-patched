import {
  BaseSource,
  Candidate,
} from "https://deno.land/x/ddc_vim@v0.12.0/types.ts";
import { batch, fn, vars } from "https://deno.land/x/ddc_vim@v0.12.0/deps.ts";
import type {
  GatherCandidatesArguments,
} from "https://deno.land/x/ddc_vim@v0.12.0/base/source.ts";

interface VimCompleteItem {
  word: string;
  abbr?: string;
  menu?: string;
  info?: string;
  kind?: string;
  icase?: number;
  equal?: number;
  dup?: number;
  empty?: number;
  // deno-lint-ignore camelcase
  user_data?: string;
}

type Params = {
  include: string[] | null;
  exclude: string[] | null;
};

export class Source extends BaseSource<Params> {
  async gatherCandidates(
    args: GatherCandidatesArguments<Params>,
  ): Promise<Candidate[]> {
    const p = args.sourceParams as Params;
    await batch(args.denops, async (denops) => {
      await vars.g.set(denops, "ddc_coc_patched#internal#items", null);
      await fn.call(
        denops,
        "CocAction",
        ["requestCompletion", "ddc_coc_patched#internal#callback"],
      );
    });
    // TODO: polling
    const items: VimCompleteItem[] = await (async () => {
      const t = async (): Promise<VimCompleteItem[] | null> => {
        const tmp: VimCompleteItem[] | null = await vars.g.get(
          args.denops,
          "ddc_coc_patched#internal#items",
        );
        return tmp;
      };
      for (let i = 0; i < 10; i++) {
        const tmp = await t();
        if (tmp) return tmp;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      for (let i = 0; i < 20; i++) {
        const tmp = await t();
        if (tmp) return tmp;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return [];
    })();
    const cs: Candidate[] = items
      .filter((item) => {
        if (p.include === null) return true;
        if (!item.menu) return false;
        const menu = item.menu.substring(1, item.menu.length - 1);
        return p.include.includes(menu);
      })
      .filter((item) => {
        if (p.exclude === null) return true;
        if (!item.menu) return true;
        const menu = item.menu.substring(1, item.menu.length - 1);
        return !p.exclude.includes(menu);
      })
      .map((item) => ({
        word: item.word,
        menu: item.menu,
        dup: Boolean(item.dup),
        kind: item.kind,
        info: item.info,
        user_data: item.user_data,
      }));
    return cs;
  }

  params(): Params {
    return {
      include: null,
      exclude: null,
    };
  }
}
