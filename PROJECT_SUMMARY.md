# Project Summary: Workshop Traceability System

**English** | [中文](#中文版)

---

## English Version

### 1. Project Motivation

This workshop lacked a unified traceability management system. When product issues arose, it was difficult to trace back to the specific batch, operator, or process. The factory needed a tool that was easy for workers to use on-site while also giving management a clear overview of production data.

### 2. Key Problems Solved

- **Requirement Understanding**: I spent significant time clarifying which requirements I could actually fulfill from the factory owner's needs.
- **Quick Query**: Workers scan a QR code to instantly view all processes and current completion status of a product.
- **Process Registration**: Workers select and submit completed processes; the system records the operator and timestamp.
- **Quality Control**: Managers can mark defective processes, directly impacting the pass rate statistics.
- **Data Management**: Administrators can manage batches, import Excel data, and generate QR code labels.
- **Data Statistics**: Managers can view employee completion counts, pass rates, product completion counts, batch info, and pass rates.

### 3. Technology Choices

- **Why CloudBase?** It's a "Backend-as-a-Service" that saved me significant time on infrastructure and maintenance, allowing me to focus on business logic.
- **Why not Vue/React?** I wanted to keep the project lightweight, easy to deliver, and easy to modify without framework dependencies.

### 4. Major Challenges Encountered

- **QR Scanning + Batch Mode**: Mapping scan results to product batches, and implementing continuous scanning for the same process across multiple products — this state management took considerable effort.
- **Tencent Cloud CloudBase**: I learned CloudBase from scratch, including cloud functions, database setup, and deployment. I spent significant time troubleshooting cloud function issues.
- **Database Relationship Design**: The many-to-many relationship between process plans and production records required careful design to maintain data consistency — this made me revisit fundamental database design principles.
- **Feature Additions & Bug Fixes**: During actual use in the factory, numerous issues were discovered and new requirements emerged. I learned to identify system vulnerabilities and gaps through real-world feedback.

### 5. Future Improvements

- **User Permissions**: Currently using a hardcoded admin list. Could integrate with the factory's login system.
- **Offline Support**: If workshop network is unstable, Service Worker could cache more data for offline use.
- **Desktop Admin Panel**: A computer-optimized admin UI would make management easier for administrators.
- **WeChat Integration**: The factory owner has wanted automatic WeChat Work user ID reading and QR code scanning directly within WeChat, but this is blocked by Tencent's security policies.

### 6. What I Learned

This project taught me the complete journey from requirements to delivery. It's not just about writing code — it includes understanding the business context, designing data structures, considering user workflows, and making the成果 understandable to others.

---

---

## 中文版

### 1. 项目的动机是什么？

这家工厂在生产流程中缺少统一的追溯管理，产品出了问题之后很难查到哪一批、哪个人、哪个工序出了问题。他们需要一个方便工人现场操作，同时能让管理者掌握全局的工具。

### 2. 我主要解决了哪几个问题？

- **理解要求**：老板表达了不少需求，我花了很大力气理解有哪些需求是我能满足的。
- **快速查询**：工人扫一下二维码，就能看到这个产品的所有工序和当前完成状态。
- **工序登记**：工人选择自己完成的工序并提交，系统记录下操作者和时间。
- **质量控制**：管理者可以标记不合格的工序，并影响良品率统计。
- **数据管理**：管理员可以通过批次管理、批量导入、二维码生成等功能完成日常数据维护。
- **数据统计**：管理员可以查看员工完成数量·良品率，产品的完成数量·批次·良品率。

### 3. 技术选型背后的思考

- **为什么用 CloudBase？** 因为它是“后端即服务”，我可以省下很多搭建和运维的时间，把精力放在业务功能上。
- **为什么不用 Vue/React？** 我想尽量保持项目的轻量化，便于交付和修改。

### 4. 过程中遇到的主要挑战

- **扫码和批量扫码**：扫码结果需要映射到产品批次，并且要做到同一个工序能连续登记多个产品，这部分状态管理花了不少功夫。
- **腾讯云 CloudBase**：从0开始学习并构建后台、云函数、数据库，给了我很大的困难。我在云函数的各种问题上花费了不少时间。
- **数据库关系设计**：工序计划和生产记录之间的多对多关系需要保持数据一致性，让我重新复习了数据库设计的基本原则。
- **功能增加&漏洞修复**：工厂在实际使用中发现了不少的问题，也提出了不少新的需求。我在其中认知到了系统中的漏洞和功能的缺失。

### 5. 哪些地方还可以继续改进？

- **用户权限**：目前通过管理员名单控制功能可见性，之后可以考虑和工厂的登录系统对接。
- **离线能力**：如果车间网络不稳定，可以考虑 Service Worker 做更多数据缓存。
- **电脑端适配管理后台**：做出电脑端适配后台UI，更方便公司管理员进行管理。
- **微信登录**：老板一直想要网站可以自动读取企业微信的ID和在微信中快速开启扫一扫功能，但是受限于腾讯的安全措施一直无法完成。

### 6. 我学到了什么？

这个项目让我真正理解了一个系统从需求到交付的完整过程。它不只是写代码，还包括理解业务场景、设计数据结构、考虑用户操作流程、以及怎样让成果被其他人看懂。
