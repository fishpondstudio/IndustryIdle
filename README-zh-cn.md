# Industry Idle

![](https://cdn.cloudflare.steamstatic.com/steam/apps/1574000/ss_516ee1711516b0cf66b7748122b0fa74073dc36f.1920x1080.jpg)

Industry Idle 是一款集工厂建设、资源管理和市场交易于一体的闲置游戏。设计和建造你的基地，扩大生产规模，改进和优化经济。此外，您还可以获得游戏中的所有增益：离线收入、声望以解锁更强大的升级。

-   [在 Steam 上游玩] (Windows/Mac/Linux)](https://store.steampowered.com/app/1574000/Industry_Idle/)
-   [下载ios版本](https://apps.apple.com/us/app/industry-idle-factory-tycoon/id1554773046)
-   [下载Android版本（GooglePlay）](https://play.google.com/store/apps/details?id=com.fishpondstudio.industryidle)
-   [在浏览器里面玩](https://play.industryidle.com/)
-   [加入Discord](https://discord.com/invite/xgNxpsM)

# 参与其中

加入我们的Discord [#industry-idle-dev](https://discord.com/channels/631551126377857044/1036015139389984768) 讨论开发问题

## 本地化

所有翻译均由社区完成。如果您想贡献翻译, 请访问 [这里](https://github.com/fishpondstudio/IndustryIdle/tree/main/assets/Script/Languages)。

## Bugfix

复刻版本库，并提交 PR。联系我 (FishPond#7427) 在 [Discord](https://discord.com/invite/xgNxpsM) 上如果您需要帮助。

## 新功能

如果您希望您的功能被合并和发布，请与我联系 (FishPond#7427) 在 [Discord](https://discord.com/invite/xgNxpsM) 上**之前** 实施该功能。对大多数玩家有益的功能（如 QoL 改进）很有可能被合并。影响游戏平衡的功能需要仔细讨论和测试。
# 部署

要制作游戏，您需要:

-   Cocos Creator [2.4.x](https://www.cocos.com/en/creator/download). 查看[此处]。(https://github.com/fishpondstudio/IndustryIdle/blob/main/project.json) 为游戏使用的版本。由于不同版本的 Cocos Creator 经常会出现不兼容的情况，因此请获取准确的版本。

-   Node.js 16 LTS 和 TypeScript
-   ESlint 和 Prettier
-   我们支持VSCode当编辑器/IDE 但你也可以自由使用你自己的

这里有两个子模块在这个仓库 - 它们包含私有模块 - 你不需要用他们开发. 不过，您确实需要在`assets/Script/Config/Config.ts`。 (您需要创建 `Config` 文件夹). 已提供内容示例 [这里](https://github.com/fishpondstudio/IndustryIdle/blob/main/assets/Script/General/Config.ts.sample)。

你应该会在Cocos Creator打开这个项目和运行这个游戏（吧？）. 大部分游戏逻辑在 `assets/Script/` 文件夹. 游戏美术在 `assets/resources/` 文件夹.

在提交你的PR之前, 理顺你的代码:

-   没有TypeScript 兼容错误
-   没有ESLint 警告
-   已格式化在 Prettier 应用此规则在项目

## 关于服务器反作弊

为了方便开发，开发代码可以连接到游戏的交易服务器。不过，账户将不会通过 "验证"（即适用某些交易限制）。此外，请不要向服务器提交测试交易，因为这很可能会引起反作弊标记。

# 许可证

- 游戏源代码采用 GNU General Public License v3.0 许可。
- 第三方库根据其相应的许可证进行许可。
- 本资源库包含游戏的美术作品和资产。但是，由于原始许可证的复杂性，请不要对其进行再分发。
