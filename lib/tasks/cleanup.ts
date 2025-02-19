// import { prisma } from "@/lib/prisma"
//
// /**
//  * 清理过期和无用的数据
//  * 包括：
//  * 1. 过期的会话
//  * 2. 过期的传输码
//  * 3. 孤立的文件记录（没有关联的传输码）
//  */
// export async function cleanupTask() {
//   try {
//     console.log("开始执行清理任务...")
//     const now = new Date()
//
//     // 1. 清理过期会话
//     const expiredSessions = await prisma.transferSession.deleteMany({
//       where: {
//         expiresAt: {
//           lt: now
//         }
//       }
//     })
//     console.log(`已清理 ${expiredSessions.count} 个过期会话`)
//
//     // 2. 清理过期的传输码
//     const expiredCodes = await prisma.transferCode.updateMany({
//       where: {
//         expires: {
//           not: null,
//           lt: now
//         },
//         disableReason: null
//       },
//       data: {
//         disableReason: "LIMIT"
//       }
//     })
//     console.log(`已禁用 ${expiredCodes.count} 个过期传输码`)
//
//     // 3. 清理孤立的文件记录
//     // 首先找出没有关联传输码的文件
//     const orphanedFiles = await prisma.file.findMany({
//       where: {
//         transferCodes: {
//           none: {}
//         }
//       },
//       select: {
//         id: true,
//         s3BasePath: true
//       }
//     })
//
//     if (orphanedFiles.length > 0) {
//       // 删除孤立的文件记录
//       await prisma.file.deleteMany({
//         where: {
//           id: {
//             in: orphanedFiles.map(f => f.id)
//           }
//         }
//       })
//       console.log(`已清理 ${orphanedFiles.length} 个孤立文件记录`)
//
//       // TODO: 这里可以添加删除S3文件的逻辑
//       // const s3BasePath = orphanedFiles.map(f => f.s3BasePath)
//       // await deleteS3Files(s3BasePath)
//     }
//
//     console.log("清理任务完成")
//   } catch (error) {
//     console.error("清理任务执行失败:", error)
//   }
// }