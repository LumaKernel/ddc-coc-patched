import {
  BaseSource,
  Candidate,
} from "https://deno.land/x/ddc_vim@v0.16.0/types.ts";
import { fn } from "https://deno.land/x/ddc_vim@v0.16.0/deps.ts";
import type {
  GatherCandidatesArguments,
} from "https://deno.land/x/ddc_vim@v0.16.0/base/source.ts";

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
  private counter = 0;
  async gatherCandidates(
    args: GatherCandidatesArguments<Params>,
  ): Promise<Candidate[]> {
    this.counter = (this.counter + 1) % 100;

    const p = args.sourceParams;
    const ready = await args.denops.eval(
      "coc#rpc#ready()&&get(g:,'coc_enabled',0)",
    ).catch(() => 0) as 0 | 1;
    if (!ready) return [];

    const id = `source/${this.name}/${this.counter}`;

    const [items] = await Promise.all([
      args.onCallback(id) as Promise<VimCompleteItem[]>,
      fn.call(
        args.denops,
        "CocAction",
        ["requestCompletion", "ddc_coc_patched#internal#callback", [id]],
      ),
    ]);

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
