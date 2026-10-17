# Changelog

本文件记录 aigw-panel 的显著变更。日期格式为 YYYY-MM-DD。

## 2026-10-17

### Added

- 请求日志新增客户端列：展示客户端产品名称与独立版本，悬停提示显示 `client_variant`（名称与版本均解析成功时）或原始 `client_user_agent`，支持键盘聚焦；客户端列无点击弹窗。
- 日志详情弹窗补充客户端字段展示，含 `client_user_agent_truncated` 截断标记；旧服务端字段缺失时兼容显示未知/破折号。
- 开发代理目标可通过 `AIGW_DEV_PROXY_TARGET` 环境变量覆盖（默认 `http://127.0.0.1:8217`），支持 IPv6 字面量地址，配置仅用于开发代理、不进入构建产物；说明见 README。

### Fixed

- 修正 `ApiKeyColumns` 过时的列宽断言：key 列宽度已在此前的样式调整中有意缩窄为 200px，测试期望值同步更新。

## 2026-10-16 及更早

历史变更见 Git 提交记录。
