// Every resource of the train game, named by its role in TrainPlugin.cnf.
// Sprites are decoded with the palette of the scene they are drawn in.
import type { Assets, Sprite } from '../engine/assets';
import type { AudioSystem } from '../engine/audio';

const G = 'traindata/gfx/';
const game = (file: string) => ({ file: G + file, scene: 'game' as const });
const side = (file: string) => ({ file: G + file, scene: 'side' as const });

export const GFX = {
  bg_tracks: game('trackcb.til'),
  bg_hugohitbuffer: game('brase.til'),
  hugo_tellonelife: game('htalest.cgf'),
  change_track_left_from_right: game('skiftrm.cgf'),
  change_track_right_from_middle: game('skiftmr.cgf'),
  change_track_right_from_left: game('skiftlm.cgf'),
  change_track_left_from_middle: game('skiftml.cgf'),
  track_closing_left: game('mskinv.cgf'),
  track_closing_middle: game('mskinm.cgf'),
  track_closing_right: game('mskinh.cgf'),
  buffer_front_left: game('stopklv.cgf'),
  buffer_front_middle: game('stopklm.cgf'),
  buffer_front_right: game('stopklh.cgf'),
  buffer_back_left: game('stopklbv.cgf'),
  buffer_back_middle: game('stopklbm.cgf'),
  buffer_back_right: game('stopklbh.cgf'),
  tm_track_straight_middle: game('tsm.cgf'),
  tm_track_straight_left: game('tsl.cgf'),
  tm_track_straight_right: game('tsr.cgf'),
  tm_track_change_left_front: game('tclf.cgf'),
  tm_track_change_right_front: game('tcrf.cgf'),
  tm_track_change_left_back: game('tclb.cgf'),
  tm_track_change_right_back: game('tcrb.cgf'),
  tm_stop_front_side: game('skfs.cgf'),
  tm_stop_front_middle: game('skfm.cgf'),
  tm_stop_back_side: game('skbs.cgf'),
  tm_stop_back_middle: game('skbm.cgf'),
  tm_grass_left: game('tgl.cgf'),
  tm_grass_middle: game('tgm.cgf'),
  tm_grass_right: game('tgr.cgf'),
  tm_train_left: game('trainl.cgf'),
  tm_train_middle: game('trainm.cgf'),
  tm_train_right: game('trainr.cgf'),
  tm_hugo_left: game('harrowl.cgf'),
  tm_hugo_middle: game('harrowm.cgf'),
  tm_hugo_right: game('harrowr.cgf'),
  hugo_live: game('hugolive.cgf'),
  hugo_score: game('points.cgf'),
  hugo_pile: game('hugopile.cgf'),
  hugo_catch: game('hssack.cgf'),
  hugo_turn: game('hsturn.cgf'),
  sack_uppost_left: game('stolpoev.cgf'),
  sack_uppost_right: game('stolpoeh.cgf'),
  sack_botpost_left: game('stolpnv.cgf'),
  sack_botpost_right: game('stolpnh.cgf'),
  sack_left: game('sack4v.cgf'),
  sack_right: game('sack4h.cgf'),
  hugo_cart_left: game('vognv.cgf'),
  hugo_cart_middle: game('vognm.cgf'),
  hugo_cart_right: game('vognh.cgf'),
  hugo_scart_left: game('vogn_ipv.cgf'),
  hugo_scart_middle: game('vogn_ipm.cgf'),
  hugo_scart_right: game('vogn_iph.cgf'),
  hugo_pump: game('hspump.cgf'),
  hugo_hit: game('hsramme.cgf'),
  hugo_hitloco: game('hsgisp.cgf'),
  hugo_smack: game('hklask.cgf'),
  hugo_smack_tail: game('hklask2.cgf'),
  hugo_flyv: side('hvarm.cgf'),
  hugo_bucketsync: side('hvarmsc.cgf'),
  hugo_endtalk: game('hugoend.cgf'),
  hugo_banke1: game('hand1.cgf'),
  hugo_banke2: game('hand2.cgf'),
  grass_left: game('graesv.cgf'),
  grass_middle: game('graesm.cgf'),
  grass_right: game('graesh.cgf'),
  in_movevognanim: side('hssidea.cgf'),
  in_vognanim: side('hsside.cgf'),
  in_scroll: side('scrllay.cgf'),
  in_skyer: side('skyer1.cgf'),
  tree1: game('traea.cgf'),
  tree2: game('traeb.cgf'),
  tree3: game('traec.cgf'),
  trainl: game('togv.cgf'),
  trainm: game('togm.cgf'),
  trainr: game('togh.cgf'),
  fence: game('laage1.cgf'),
} as const;

export type TilRole = 'bg_tracks' | 'bg_hugohitbuffer';
export type GfxRole = Exclude<keyof typeof GFX, TilRole>;

const S = 'traindata/speaks/';
export const SPEAKS: Record<string, string> = {
  syncsnd_start: `${S}003-01.wav`,
  syncsnd_hitbufffer: `${S}003-02.wav`, // sic: misspelt in the original
  syncsnd_onelife: `${S}003-03.wav`,
  syncsnd_hittrain: `${S}003-04.wav`,
  syncsnd_buckettalk: `${S}003-05.wav`,
  syncsnd_lastlife: `${S}003-06.wav`,
  syncsnd_gameover: `${S}003-07.wav`,
  syncsnd_reachedend: `${S}003-08.wav`,
};

const Y = 'traindata/syncs/';
export const SYNCS: Record<string, string> = {
  sync_intro: `${Y}003-01.oos`,
  sync_crashstart: `${Y}003-02.oos`,
  sync_onelifeleft: `${Y}003-03.oos`,
  sync_buckettalk: `${Y}003-05.oos`,
  sync_lastlife: `${Y}003-06.oos`,
  sync_gameover: `${Y}003-07.oos`,
  sync_endtrack: `${Y}003-08.oos`,
};

const X = 'traindata/sfx/';
export const SFX: Record<string, string> = {
  snd_bonk: `${X}bonk.wav`,
  snd_bum: `${X}bum.wav`,
  snd_baathorn: `${X}baathorn.wav`,
  snd_flyby: `${X}flyby.wav`,
  snd_flyby2: `${X}flyby2.wav`,
  snd_grydelaag: `${X}grydelag.wav`,
  snd_host: `${X}host.wav`,
  snd_haandtag: `${X}haandtag.wav`,
  snd_klik: `${X}klik.wav`,
  snd_monitor: `${X}monitor.wav`,
  snd_ouhv: `${X}ouhv.wav`,
  snd_piiiv: `${X}piiiv.wav`,
  snd_piiiv2: `${X}piiiv.wav`,
  snd_pivedyr: `${X}pivedyr.wav`,
  snd_skrab: `${X}skrab.wav`,
  snd_skramle: `${X}skramle.wav`,
  snd_skrid: `${X}skrid-lp3.wav`,
  snd_syde: `${X}syde.wav`,
  snd_saek_ond: `${X}saek-ond.wav`,
  snd_saek_super: `${X}saek-super.wav`,
  snd_saek: `${X}saek.wav`,
  snd_tog_loop: `${X}tog-loop.wav`,
  snd_tude: `${X}tude.wav`,
  snd_tudeby: `${X}tudeby.wav`,
  snd_tudehorn: `${X}tudehorn.wav`,
  snd_uuhva: `${X}uuhva.wav`,
  snd_woodsticks: `${X}woodsticks.wav`,
};

export interface TrainRes {
  sprite(role: GfxRole): Sprite;
  til(role: TilRole): HTMLCanvasElement[];
  sync(role: string): number[];
}

export async function loadTrainResources(assets: Assets, audio: AudioSystem): Promise<TrainRes> {
  const palettes = {
    game: await assets.palette(GFX.bg_tracks.file),
    side: await assets.embeddedPalette(GFX.in_scroll.file),
  };
  const sprites = new Map<string, Sprite>();
  const tils = new Map<string, HTMLCanvasElement[]>();
  const syncs = new Map<string, number[]>();

  await Promise.all([
    ...Object.entries(GFX).map(async ([role, { file, scene }]) => {
      if (file.endsWith('.til')) tils.set(role, await assets.til(file));
      else sprites.set(role, await assets.sprite(file, palettes[scene]));
    }),
    ...Object.entries(SYNCS).map(async ([role, file]) => syncs.set(role, await assets.sync(file))),
    ...Object.entries({ ...SPEAKS, ...SFX }).map(async ([role, file]) => audio.register(role, await assets.sound(file))),
  ]);

  return {
    sprite: (role) => sprites.get(role)!,
    til: (role) => tils.get(role)!,
    sync: (role) => {
      const s = syncs.get(role);
      if (!s) throw new Error(`Unknown sync ${role}`);
      return s;
    },
  };
}
