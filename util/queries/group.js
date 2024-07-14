import mongoose from "mongoose";
import { groupRoles } from "../roles.js";
import { WhoCanPostorApproveMemberRequest } from "../configGroup.js";
import { privacy as privacyGroup } from "../configGroup.js";
export const mainInformationForNotMembers = (
  groupId,
  role,
  isHeSendRequest,
  isHeinvited,
  privacy
) => {
  return [
    {
      $match: { _id: new mongoose.Types.ObjectId(groupId) },
    },
    {
      $addFields: {
        role: role,
        isHeSendRequestToJoined: isHeSendRequest ? true : false,
        hasInvited: isHeinvited ? true : false,
        canSearch: privacy === privacyGroup.PRIVATE ? false : true,
        isHeHasRequestsPost: false,
        CanApproveMemberRequest: false,
        canPost: false,
      },
    },
    {
      $project: {
        name: 1,
        privacy: 1,
        visibility: 1,
        description: 1,
        cover: 1,
        role: 1,
        isHeSendRequestToJoined: 1,
        hasInvited: 1,
        canSearch: 1,
        isHeHasRequestsPost: 1,
        CanApproveMemberRequest: 1,
        canPost: 1,
      },
    },
  ];
};

export const mainInformationForMembers = (
  groupId,
  role,
  isHeSendRequest,
  isHeinvited,
  yourId
) => {
  return [
    {
      $match: { _id: new mongoose.Types.ObjectId(groupId) },
    },
    {
      $addFields: {
        role: role,
        isHeSendRequestToJoined: isHeSendRequest ? true : false,
        hasInvited: isHeinvited ? true : false,
        canSearch: true,
        isHeHasRequestsPost: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$requestPosts",
                  as: "requestPost",
                  cond: {
                    $eq: [
                      "$$requestPost.ownerId",
                      new mongoose.Types.ObjectId(yourId),
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        CanApproveMemberRequest:
          "$whoCanApproveMemberRequest" ===
          WhoCanPostorApproveMemberRequest.ANY_ONE_IN_GROUP
            ? true
            : false,
        canPost:
          "$whoCanPost" === WhoCanPostorApproveMemberRequest.ANY_ONE_IN_GROUP
            ? true
            : false,
      },
    },
    {
      $project: {
        name: 1,
        privacy: 1,
        visibility: 1,
        immediatePost: 1,
        description: 1,
        cover: 1,
        role: 1,
        isHeSendRequestToJoined: 1,
        hasInvited: 1,
        canSearch: 1,
        isHeHasRequestsPost: 1,
        CanApproveMemberRequest: 1,
      },
    },
  ];
};

export const mainInformationForAdminsAndModerator = (groupId, role) => {
  return [
    {
      $match: { _id: new mongoose.Types.ObjectId(groupId) },
    },
    {
      $addFields: {
        role: role,
        isHeSendRequestToJoined: false,
        hasInvited: false,
        canSearch: true,
        isHeHasRequestsPost: false,
        CanApproveMemberRequest: true,
        canPost: true,
      },
    },
    {
      $project: {
        name: 1,
        privacy: 1,
        visibility: 1,
        immediatePost: 1,
        whoCanApproveMemberRequest: 1,
        whoCanPost: 1,
        description: 1,
        cover: 1,
        role: 1,
        isHeSendRequestToJoined: 1,
        hasInvited: 1,
        canSearch: 1,
        isHeHasRequestsPost: 1,
        CanApproveMemberRequest: 1,
      },
    },
  ];
};

export const members = (groupId, page, ITEMS_PER_PAGE) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(groupId, page, ITEMS_PER_PAGE),
      },
    },
    {
      $facet: {
        totalCount: [{ $project: { membersCount: { $size: "$members" } } }],
        allMembers: [
          {
            $project: {
              _id: 0,
              members: 1,
            },
          },
          { $unwind: "$members" },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "members.userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $sort: { "members.joiningDate": 1 }, // Sort posts within each group by updatedAt descending
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
          {
            $unwind: "$user",
          },
          {
            $project: {
              userId: "$user._id",
              firstName: "$user.firstName",
              lastName: "$user.lastName",
              logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              joiningDate: "$members.joiningDate",
            },
          },
        ],
      },
    },
    {
      $project: {
        allMembers: 1,
        totalCount: { $arrayElemAt: ["$totalCount.membersCount", 0] },
      },
    },
  ];
};

export const admins = (groupId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(groupId) } },
    {
      $facet: {
        totalCount: [{ $project: { adminsCount: { $size: "$admins" } } }],
        admins: [
          {
            $project: {
              _id: 0,
              admins: 1,
            },
          },
          { $unwind: "$admins" },
          {
            $lookup: {
              from: "users",
              localField: "admins.userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $sort: { "admins.joiningDate": 1 },
          },
          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
          {
            $unwind: "$user",
          },
          {
            $project: {
              userId: "$user._id",
              firstName: "$user.firstName",
              lastName: "$user.lastName",
              logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              joiningDate: "$admins.joiningDate",
            },
          },
        ],
      },
    },
    {
      $project: {
        admins: 1,
        totalCount: { $arrayElemAt: ["$totalCount.adminsCount", 0] },
      },
    },
  ];
};
export const membersBlocked = (groupId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(groupId) } },
    {
      $facet: {
        totalCount: [
          { $project: { membersBlockedCount: { $size: "$membersBlocked" } } },
        ],
        membersBlocked: [
          {
            $project: {
              _id: 0,
              membersBlocked: 1,
            },
          },
          { $unwind: "$membersBlocked" },
          {
            $lookup: {
              from: "users",
              localField: "membersBlocked",
              foreignField: "_id",
              as: "user",
            },
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
          {
            $unwind: "$user",
          },
          {
            $project: {
              userId: "$user._id",
              firstName: "$user.firstName",
              lastName: "$user.lastName",
              logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
            },
          },
        ],
      },
    },
    {
      $project: {
        membersBlocked: 1,
        totalCount: { $arrayElemAt: ["$totalCount.membersBlockedCount", 0] },
      },
    },
  ];
};

export const posts = (
  groupId,
  blockedProfiles,
  profilesYouBlocked,
  role,
  yourId,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    { $match: { group: new mongoose.Types.ObjectId(groupId) } },
    {
      $facet: {
        count: [
          {
            $group: {
              _id: null,
              withFilter: { $push: "$userId" },
              withoutFilter: { $sum: 1 },
            },
          },
          {
            $project: {
              withFilter: {
                $size: {
                  $filter: {
                    input: "$withFilter",
                    as: "user",
                    cond: {
                      $not: {
                        $in: [
                          "$$user",
                          [...blockedProfiles, ...profilesYouBlocked],
                        ],
                      },
                    },
                  },
                },
              },
              withoutFilter: 1,
              _id: 0,
            },
          },
          {
            $project: {
              postCount: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: [role, groupRoles.MODERATOR] },
                      { $ne: [role, groupRoles.ADMIN] },
                    ],
                  },

                  then: "$withFilter",
                  else: "$withoutFilter",
                },
              },
            },
          },
        ],
        posts: [
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: "$user",
          },
          {
            $lookup: {
              from: "groups",
              localField: "group",
              foreignField: "_id",
              as: "group",
            },
          },
          {
            $unwind: {
              path: "$group",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              owner: {
                userId: "$user._id",
                firstName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
              post: {
                _idPost: "$_id",
                description: "$description",
                assets: "$assets",
                numberOfComments: { $size: "$comments" },
                numberOfLikes: { $size: "$likes" },
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                userRole: "$userRole",
                isHeLikedInPost: {
                  $cond: {
                    if: { $in: [yourId, "$likes"] },
                    then: true,
                    else: false,
                  },
                },
              },
              group: {
                groupId: "$group._id",
                description: "$group.description",
                name: "$group.name",
                cover: "$group.cover",
                membersBlocked: "$group.membersBlocked",
                yourRoleInGroup: {
                  $cond: {
                    if: {
                      $in: [
                        new mongoose.Types.ObjectId(yourId),
                        "$group.members.userId",
                      ],
                    },
                    then: groupRoles.MEMBER,
                    else: {
                      $cond: {
                        if: {
                          $in: [
                            new mongoose.Types.ObjectId(yourId),
                            "$group.admins.userId",
                          ],
                        },
                        then: groupRoles.ADMIN,
                        else: groupRoles.MODERATOR,
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $addFields: {
              isHeOwnerOfPost: {
                $cond: {
                  if: { $eq: ["$owner.userId", yourId] },
                  then: true,
                  else: false,
                },
              },
              canUpdate: {
                $cond: {
                  if: { $eq: ["$owner.userId", yourId] },
                  then: true,
                  else: false,
                },
              },
              canDelete: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: ["$owner.userId", yourId] },
                      {
                        $and: [
                          { $eq: [role, groupRoles.ADMIN] },
                          {
                            $eq: ["$post.userRole", groupRoles.MEMBER],
                          },
                        ],
                      },
                      { $eq: [role, groupRoles.MODERATOR] },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              canReport: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$post.userRole", groupRoles.MODERATOR] },
                      { $ne: [role, groupRoles.NOT_Member] },
                      { $ne: ["$owner.userId", yourId] },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              canBlock: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $in: ["$post.userRole", [groupRoles.MEMBER]] },
                          { $eq: [role, groupRoles.ADMIN] },
                          { $ne: ["$owner.userId", yourId] },
                          {
                            $not: {
                              $in: [
                                "$owner.userId",
                                { $ifNull: ["$group.membersBlocked", []] },
                              ],
                            },
                          },
                        ],
                      },
                      {
                        $and: [
                          { $eq: [role, groupRoles.MODERATOR] },
                          { $ne: ["$owner.userId", yourId] },
                          {
                            $not: {
                              $in: [
                                "$owner.userId",
                                { $ifNull: ["$group.membersBlocked", []] },
                              ],
                            },
                          },
                        ],
                      },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              canCommentOrLike: {
                $cond: {
                  if: { $eq: [role, groupRoles.NOT_Member] },
                  then: false,
                  else: true,
                },
              },
            },
          },
          {
            $project: {
              "group.membersBlocked": 0,
            },
          },
          {
            $sort: { "post.updatedAt": -1 }, // Sort posts within each group by updatedAt descending
          },
          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
        ],
      },
    },
    {
      $project: {
        posts: 1,
        totalCount: { $arrayElemAt: ["$count.postCount", 0] },
      },
    },
  ];
};

export const requestPosts = (groupId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(groupId) } },
    {
      $facet: {
        totalCount: [{ $project: { postsCount: { $size: "$requestPosts" } } }],

        requestPosts: [
          {
            $project: {
              _id: 0,
              requestPosts: 1,
            },
          },
          { $unwind: "$requestPosts" },

          {
            $lookup: {
              from: "posts", // Assuming your user collection is named 'users'
              localField: "requestPosts.postId",
              foreignField: "_id",
              as: "post",
            },
          },
          {
            $sort: { "post.createdAt": 1 }, // Sort posts within each group by updatedAt descending
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },

          {
            $unwind: "$post",
          },
          {
            $project: {
              _id: "$post._id",
              userId: "$post.userId",
              description: "$post.description",
              assets: "$post.assets",
              createdAt: "$post.createdAt",
              userRole: "$post.userRole",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              _id: 0,
              owner: {
                userId: "$user._id",
                firstName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
              post: {
                _idPost: "$_id",
                description: "$description",
                assets: "$assets",
                createdAt: "$createdAt",
                userRole: "$userRole",
              },
            },
          },
          {
            $addFields: {
              canDelete: true,
              canUpdate: false,
            },
          },
        ],
      },
    },

    {
      $project: {
        requestPosts: 1,
        totalCount: { $arrayElemAt: ["$totalCount.postsCount", 0] },
      },
    },
  ];
};

export const yourRequestPost = (groupId, yourId, page, ITEMS_PER_PAGE) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(groupId),
        "requestPosts.ownerId": { $eq: yourId },
      },
    },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              postsCount: {
                $size: {
                  $filter: {
                    input: "$requestPosts",
                    as: "post",
                    cond: {
                      $eq: ["$$post.ownerId", yourId],
                    },
                  },
                },
              },
            },
          },
        ],

        requestPosts: [
          {
            $project: {
              _id: 0,
              requestPosts: {
                $filter: {
                  input: "$requestPosts",
                  as: "post",
                  cond: {
                    $eq: ["$$post.ownerId", yourId],
                  },
                },
              },
            },
          },
          { $unwind: "$requestPosts" },

          {
            $lookup: {
              from: "posts", // Assuming your user collection is named 'users'
              localField: "requestPosts.postId",
              foreignField: "_id",
              as: "post",
            },
          },
          {
            $sort: { "post.createdAt": 1 }, // Sort posts within each group by updatedAt descending
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },

          {
            $unwind: "$post",
          },
          {
            $project: {
              _id: "$post._id",
              userId: "$post.userId",
              description: "$post.description",
              assets: "$post.assets",
              createdAt: "$post.createdAt",
              userRole: "$post.userRole",
            },
          },

          {
            $project: {
              _id: 0,
              post: {
                _idPost: "$_id",
                description: "$description",
                assets: "$assets",
                createdAt: "$createdAt",
              },
            },
          },
          {
            $addFields: {
              canDelete: true,
              canUpdate: true,
            },
          },
        ],
      },
    },

    {
      $project: {
        requestPosts: 1,
        totalCount: { $arrayElemAt: ["$totalCount.postsCount", 0] },
      },
    },
  ];
};
export const joiningRequest = (groupId, ITEMS_PER_PAGE, page) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(groupId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: { joiningRequestsCount: { $size: "$joiningRequests" } },
          },
        ],
        joiningRequests: [
          {
            $project: {
              _id: 0,
              joiningRequests: 1,
            },
          },
          { $unwind: "$joiningRequests" },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "joiningRequests.userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $sort: { "joiningRequests.requestDate": 1 },
          },
          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
          {
            $unwind: "$user",
          },

          {
            $project: {
              userId: "$user._id",
              firstName: "$user.firstName",
              lastName: "$user.lastName",
              logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              requestDate: "$joiningRequests.requestDate",
            },
          },
        ],
      },
    },
    {
      $project: {
        joiningRequests: 1,
        totalCount: { $arrayElemAt: ["$totalCount.joiningRequestsCount", 0] },
      },
    },
  ];
};
export const reports = (groupId, yourId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(groupId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              reportsCount: {
                $size: {
                  $filter: {
                    input: "$reports",
                    as: "report",
                    cond: {
                      $ne: ["$$report.idOfOwnerPost", yourId],
                    },
                  },
                },
              },
            },
          },
        ],
        reports: [
          {
            $project: {
              _id: 0,

              filteredReports: {
                $filter: {
                  input: "$reports",
                  as: "report",
                  cond: {
                    $ne: ["$$report.idOfOwnerPost", yourId],
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              filteredReports: 1,
            },
          },
          { $unwind: "$filteredReports" },

          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "filteredReports.from",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $lookup: {
              from: "posts", // Assuming your user collection is named 'users'
              localField: "filteredReports.postId",
              foreignField: "_id",
              as: "post",
            },
          },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "post.userId",
              foreignField: "_id",
              as: "ownerPost",
            },
          },
          {
            $sort: { "filteredReports.reportDate": -1 }, // Sort posts within each group by updatedAt descending
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
          {
            $unwind: "$user",
          },
          {
            $unwind: "$post",
          },
          {
            $unwind: "$ownerPost",
          },

          {
            $project: {
              from: {
                userId: "$user._id",
                firstName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
              post: {
                postId: "$post._id",
                description: "$post.description",
                assets: "$post.assets",
                numberOfComments: { $size: "$post.comments" },
                numberOfLikes: { $size: "$post.likes" },
                createdAt: "$post.createdAt",
                updatedAt: "$post.updatedAt",
                ownerPost: {
                  userId: "$ownerPost._id",
                  firstName: "$ownerPost.firstName",
                  lastName: "$ownerPost.lastName",
                  logo: { $arrayElemAt: ["$ownerPost.profilePhotos", -1] },
                },
              },
              reportDate: "$filteredReports.reportDate",
              description: "$filteredReports.description",
              reportId: "$filteredReports._id",
            },
          },
        ],
      },
    },
    {
      $project: {
        reports: 1,
        totalCount: { $arrayElemAt: ["$totalCount.reportsCount", 0] },
      },
    },
  ];
};
export const reportsFromAdmin = (groupId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(groupId) } },
    {
      $facet: {
        totalCount: [
          { $project: { reportsCount: { $size: "$reportsFromAdmin" } } },
        ],
        reports: [
          {
            $project: {
              _id: 0,
              reportsFromAdmin: 1,
            },
          },
          { $unwind: "$reportsFromAdmin" },

          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "reportsFromAdmin.from",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $lookup: {
              from: "posts", // Assuming your user collection is named 'users'
              localField: "reportsFromAdmin.postId",
              foreignField: "_id",
              as: "post",
            },
          },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "post.userId",
              foreignField: "_id",
              as: "ownerPost",
            },
          },
          {
            $sort: { "reportsFromAdmin.reportDate": -1 }, // Sort posts within each group by updatedAt descending
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
          {
            $unwind: "$user",
          },
          {
            $unwind: "$post",
          },
          {
            $unwind: "$ownerPost",
          },

          {
            $project: {
              from: {
                userId: "$user._id",
                firstName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
              post: {
                postId: "$post._id",
                description: "$post.description",
                assets: "$post.assets",
                numberOfComments: { $size: "$post.comments" },
                numberOfLikes: { $size: "$post.likes" },
                createdAt: "$post.createdAt",
                updatedAt: "$post.updatedAt",
                ownerPost: {
                  userId: "$ownerPost._id",
                  firstName: "$ownerPost.firstName",
                  lastName: "$ownerPost.lastName",
                  logo: { $arrayElemAt: ["$ownerPost.profilePhotos", -1] },
                },
              },
              reportDate: "$reportsFromAdmin.reportDate",
              description: "$reportsFromAdmin.description",
              reportId: "$reportsFromAdmin._id",
            },
          },
        ],
      },
    },
    {
      $project: {
        reports: 1,
        totalCount: { $arrayElemAt: ["$totalCount.reportsCount", 0] },
      },
    },
  ];
};

export const friendsWhoDidNotJoinAggregation = (
  yourId,
  groupId,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    {
      $match: {
        friends: { $in: [new mongoose.Types.ObjectId(yourId)] },
        groups: { $nin: [new mongoose.Types.ObjectId(groupId)] },
      },
    },
    {
      $facet: {
        totalCount: [{ $count: "totalCount" }],
        friends: [
          {
            $project: {
              _id: 0,
              userId: "$_id",
              firstName: 1,
              lastName: 1,
              logo: { $arrayElemAt: ["$profilePhotos", -1] },
            },
          },
          { $skip: (page - 1) * ITEMS_PER_PAGE },
          { $limit: ITEMS_PER_PAGE },
        ],
      },
    },
    {
      $project: {
        friends: 1,
        totalCount: { $arrayElemAt: ["$totalCount.totalCount", 0] },
      },
    },
  ];
};
