# lizhouai 的 GitHub 个人主页

采用“作品展示＋自动更新的近期动态”：顶部是简短介绍和四个代表项目，下面展示最近五条公开开发活动。

## 文件说明

| 文件 | 用途 |
| --- | --- |
| `profile.md` | 主页源模板。修改自我介绍、代表项目和排版时编辑这里。 |
| `README.md` | 生成后的主页，GitHub 将它显示在个人资料中。 |
| `.github/scripts/update-profile.mjs` | 获取公开活动并生成主页。只使用 Node.js 内置功能。 |
| `.github/workflows/update-profile.yml` | 每天北京时间 08:17 自动更新，也支持手动执行。 |

## 近期动态如何更新

- 展示公开代码推送、版本发布、PR、Issue，以及仓库创建。
- 只展示本人发起的公开活动，过滤个人主页仓库，避免主页自动更新产生的推送刷屏。
- 同一个项目同一天的多次代码推送只展示一条。
- GitHub Events API 没有合适活动时，改为展示最近更新的公开原创项目。
- 接口临时不可用时保留已有动态；内容没有变化时不重复提交。
- 日期统一使用北京时间。

公开动态使用 GitHub 自带的令牌，无需额外申请个人访问令牌。脚本还会明确过滤私有仓库和非公开事件。

GitHub 的公开事件接口有历史窗口和更新延迟，因此它是公开开发动态的摘要，不代表完整活动历史。每天定时执行也可能延迟。

来源：[GitHub Events API](https://docs.github.com/en/rest/activity/events)。

## 手动安装或恢复

1. 创建公开的同名仓库 `lizhouai/lizhouai`，默认分支使用 `main`。
2. 将本目录中的文件上传到仓库根目录，保留 `.github/` 目录结构，不要多套一层目录。
3. 在仓库 **Actions → Update profile activity → Run workflow** 中执行首次更新。
4. 以后修改 `profile.md` 会自动触发重新生成，也可随时手动执行。

根目录的非空 `README.md` 会出现在个人主页。[GitHub 官方说明](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme)。

## 后续加入编码时长统计

参考主页中的语言、编辑器时长来自 WakaTime。要加入同类内容，需要先从 [WakaTime 插件列表](https://wakatime.com/plugins) 安装实际使用工具对应的插件，并开始积累记录。

目前这版主页已经可以自动展示 GitHub 公开活动。后续可在同一个生成脚本中加入 WakaTime 的近 7 天编码时长和使用分布，沿用一次生成、一次提交的更新流程。

WakaTime 最新文档要求读取统计使用 OAuth 授权，或使用用户主动公开的嵌入数据；插件使用的 API Key 与读取统计的授权用途不同。接入时应按 [WakaTime 官方文档](https://wakatime.com/developers) 配置，不将密钥写入主页文件。

## 参考与内容依据

布局参考 [Twisuki 的个人主页](https://github.com/Twisuki/Twisuki)，其近期编码统计的源码位于 [profile.md](https://github.com/Twisuki/Twisuki/blob/main/profile.md)，使用 [custom_waka_readme](https://github.com/Twisuki/custom_waka_readme) 自动生成 README。

本主页的项目文案依据 lizhouai 公开仓库说明整理；未填写工作单位、学历或私人联系方式，也未填入模拟编码数据。作品列表手动维护，近期动态自动更新。
