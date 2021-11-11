import { Model, Models } from "use-models-for-data";
const { fields } = Models;

/**
 * ...
 */
class Config extends Model {
  __meta = {
    name: `config`,
    description: `Mahjong game configuration`,
    distinct: true,
  };

  static TIMEOUTS = [
    0, 100, 200, 300, 400, 500, 1000, 2000, 3000, 4000, 5000, 10000, 15000,
    30000, 60000, 3600000, 2147483647,
  ];

  static RULESETS = [
    `Cantonese`,
    `Chinese Classical`,
    `Chinese Classical for Bots`,
  ];

  static DIRECTIONS = [-1, 1];

  static WALLHACKS = [
    `self_drawn_win_clean`,
    `self_drawn_win`,
    `form_melded_kong_off_initial`,
    `kong_in_initial_deal`,
    `kong_from_first_discard`,
    `robbing_a_kong`,
    `robbing_a_selfdrawn_kong`,
    `chow_by_player_1`,
    `all_bonus_to_player`,
    `thirteen_orphans`,
    `all_green`,
    `nine_gates`,
    `little_three_dragons`,
    `chow_for_player_0`,
    `5_6_7_plus_5`,
    `5_6_7_plus_6`,
    `5_6_7_plus_7`,
    `5_6_7_8_plus_6`,
    `pung_chow_conflict`,
    `cantonese_chicken_hand`,
    `self_drawn_clean_pair_as_east`,
  ];

  allow_chat = fields.boolean({
    description: `Determines whether or not to allow players to use the chat function during a game.`,
    icon: `💬`,
    default: true,
  });

  auto_start_on_join = fields.boolean({
    description: `Immediately start a game if the player_count is reached.`,
    icon: `🟢`,
    default: true,
  });

  bot_humanizing_delay = fields.choice(Config.TIMEOUTS, {
    description: `The artificial delay between bots knowing what they want to do, and executing on that, to make humans feel like they're in a fair game.`,
    default: 100,
  });

  claim_timeout = fields.choice(Config.TIMEOUTS, {
    description: `How long a discarded tile may be claimed before play moves on to the next player.`,
    default: 5000,
  });

  end_of_hand_timeout = fields.choice(Config.TIMEOUTS, {
    description: `Grace period between a win being declared and the score breakdown getting sent to all users.`,
    icon: `⏱️`,
    default: 10000,
  });

  force_open_play = fields.boolean({
    description: `Force all players to play with their tiles visible to all other players in the game.`,
    icon: `🀅`,
    default: false,
  });

  game_mode = fields.choice([`beginner`, `normal`, `expert`], {
    description: `Indicate what kind of help we want human players to have.`,
    icon: `💻`,
    default: `normal`,
  });

  game_start_timeout = fields.choice(Config.TIMEOUTS, {
    description: `Grace period between all players joining and the game starting automatically.`,
    icon: `⏱️`,
    default: 0,
  });

  hand_start_timeout = fields.choice(Config.TIMEOUTS, {
    description: `Grace period between the initial deal and the first real play tile getting dealt.`,
    icon: `⏱️`,
    default: 10000,
  });

  play_once_ready = fields.boolean({
    description: `Don't start play until all users have indicated they are ready.`,
    icon: `⏯️`,
    default: false,
  });

  player_count = fields.choice([2, 3, 4], {
    description: `The number of players in this game`,
    icon: `👪`,
    default: 4,
  });

  randomize_seats = fields.boolean({
    description: `if false, whoever made the game starts as east, with the other players seated based on join order.`,
    icon: `❓`,
    default: false,
  });

  rotate_on_draw = fields.boolean({
    description: `Rotate the winds even when a draw occurs`,
    icon: `🔄`,
    default: true,
  });

  rotate_on_east_win = fields.boolean({
    description: `Rotate the winds even when east wins`,
    icon: `🔄`,
    default: true,
  });

  ruleset = fields.choice(Config.RULESETS, {
    description: `The ruleset to use to score a game.`,
    icon: `📜`,
    default: `Chinese Classical`,
  });

  seat_rotation = fields.choice(Config.DIRECTIONS, {
    description: `either -1 (for [0]⇒[n]⇒[n-1]⇒...⇒[0] or 1 (for [0]⇒[1]⇒...⇒[n]⇒[0])`,
    icon: `🔄`,
    default: 1,
  });

  track_discards = fields.boolean({
    description: `track which discards were from which player`,
    icon: `👀`,
    default: true,
  });

  use_single_player_timeouts = fields.boolean({
    description: `if true, timeouts will be enforced even during a single-player game`,
    icon: `⏱️`,
    default: false,
  });

  wind_rotation = fields.choice(Config.DIRECTIONS, {
    description: `either -1 (for 東⇒北⇒西⇒南) or 1 (for 東⇒南⇒西⇒北)`,
    icon: `🔄`,
    default: 1,
  });

  prng_seed = fields.number({
    description: `pseudo-random number generation seed value. Set this to 0 in order for the PRNG to pick a random seed.`,
    debug: true,
    default: 0,
  });

  wallhack = fields.choice([false, ...Config.WALLHACKS], {
    description: `Set up a very specific, predefined wall for testing the various aspects of play/scoring.`,
    debug: true,
    default: false,
  });

  max_timeout = fields.number({
    description: `max safe 32 bit signed int - roughly 25 year's worth of milliseconds`,
    configurable: false,
    default: 2147483647,
  });
}

export { Config };
