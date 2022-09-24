# Industry Idle

Industry Idle is an idle game that combines factory building, resource management and market trading. Design & build your base, expand & scale up your productions, improve & optimize your economy. Plus all the incremental game goodies: offline earnings, prestige to unlock more powerful upgrades.

-   [Play on Steam](https://store.steampowered.com/app/1574000/Industry_Idle/)
-   [Play on iOS](https://apps.apple.com/us/app/industry-idle-factory-tycoon/id1554773046)
-   [Play on Android](https://play.google.com/store/apps/details?id=com.fishpondstudio.industryidle)
-   [Play on Web](https://play.industryidle.com/)
-   [Join Discord](https://discord.com/invite/xgNxpsM)

# Get Involved

## Localization

All translations are done by the community. If you'd like to help, visit [here for more info](https://github.com/fishpondstudio/IndustryIdle/tree/main/assets/Script/Languages).

## Bugfix

Fork the repository, and submit a PR. Ping me (FishPond#7427) on [Discord](https://discord.com/invite/xgNxpsM) if you need help.

## New Features

If you want your feature to get merged and released, please discuss with me (FishPond#7427) on [Discord](https://discord.com/invite/xgNxpsM) **before** implementing the feature. Features that benefit majority players (e.g. QoL improvements) are very likely to get merged. Features that affect game balances needs to be carefully discussed and tested.

# Development

To build the game, you need:

-   Cocos Creator [2.4.x](https://www.cocos.com/en/creator/download). Check [here](https://github.com/fishpondstudio/IndustryIdle/blob/main/project.json) for the version used by the game. Please get this exact version as different versions of Cocos Creator often introduce incompatibilities.

-   Node.js 16 LTS with TypeScript
-   ESlint and Prettier
-   I recommend VSCode as editor/IDE but you are free to use your own

There are two submodules in this repository - they contain private modules - you do not need them for development. However, you do need to create a config file in `assets/Script/Config/Config.ts`. (You need to create the `Config` folder). A sample content has been provided [here](https://github.com/fishpondstudio/IndustryIdle/blob/main/assets/Script/General/Config.ts.sample).

After that, you should be able to open the project in Cocos Creator and run the game. Most of the game logic are in `assets/Script/` folder. Game arts are in `assets/resources/` folder.

Before you commit and submit a PR, make sure your code:

-   does not have TypeScript compiler error
-   does not have ESLint warnings
-   is formatted by Prettier using the rule in the project

# License

-   Game's source code is licensed under GNU General Public License v3.0.
-   Third party libraries are licensed under their corresponding licenses.
-   Game's artworks and assets are included in this repository. However, due to the complications of the original licenses, please do not redistribute them.
