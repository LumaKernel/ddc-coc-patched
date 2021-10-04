import {
  BaseSource,
  Candidate,
} from "https://deno.land/x/ddc_vim@v0.13.0/types.ts";
import { batch, fn, vars } from "https://deno.land/x/ddc_vim@v0.13.0/deps.ts";
import type {
  GatherCandidatesArguments,
} from "https://deno.land/x/ddc_vim@v0.13.0/base/source.ts";

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

// Vim funcname constraints can be found at :help E124.
// Leading numbers are allowed in autoload name.
const escapeVimAutoloadName = (name: string) => {
  let escaped = "";
  for (let i = 0; i < name.length; i++) {
    if (name.charAt(i).match(/[a-zA-Z0-9]/)) escaped += name.charAt(i);
    else escaped += `_${name.charCodeAt(i)}_`;
  }
  return escaped;
};

const escapeVimAutoloadNameCache = new Map<string, string>();
const escapeVimAutoloadNameCached = (name: string) => {
  if (!escapeVimAutoloadNameCache.has(name)) {
    escapeVimAutoloadNameCache.set(name, escapeVimAutoloadName(name));
  }
  return escapeVimAutoloadNameCache.get(name);
};

export class Source extends BaseSource<Params> {
  async gatherCandidates(
    args: GatherCandidatesArguments<Params>,
  ): Promise<Candidate[]> {
    const escaped = escapeVimAutoloadNameCached(this.name);
    const p = args.sourceParams as Params;
    // deno-lint-ignore no-explicit-any
    const ready = await fn.call(args.denops, "coc#rpc#ready", []) as any;
    if (!ready) return [];
    await batch(args.denops, async (denops) => {
      await vars.g.set(
        denops,
        `ddc_coc_patched#internal#items#${escaped}`,
        null,
      );
      await fn.call(
        denops,
        "CocAction",
        ["requestCompletion", "ddc_coc_patched#internal#callback", [escaped]],
      );
    });

    const items: VimCompleteItem[] = await (async () => {
      const tmp: VimCompleteItem[] | null = await vars.g.get(
        args.denops,
        `ddc_coc_patched#internal#items#${escaped}`,
      );
      if (tmp) return tmp;
      return [];
    })();
    // const items: VimCompleteItem[] = await (async () => {
    //   const t = async (): Promise<VimCompleteItem[] | null> => {
    //     const tmp: VimCompleteItem[] | null = await vars.g.get(
    //       args.denops,
    //       `ddc_coc_patched#internal#items#${escaped}`,
    //     );
    //     return tmp;
    //   };
    //   for (let i = 0; i < 10; i++) {
    //     const tmp = await t();
    //     if (tmp) return tmp;
    //     await new Promise((resolve) => setTimeout(resolve, 10));
    //   }
    //   for (let i = 0; i < 20; i++) {
    //     const tmp = await t();
    //     if (tmp) return tmp;
    //     await new Promise((resolve) => setTimeout(resolve, 100));
    //   }
    //   return [];
    // })();
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
