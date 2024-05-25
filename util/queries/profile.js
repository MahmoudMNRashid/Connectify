import { visibility } from "../configGroup.js";
import { whoCanComment_Page } from "../configPage.js";
import { whoCanSee_Profile } from "../configProfile.js";
import { groupRoles, profileRoles } from "../roles.js";
import mongoose from "mongoose";
export const posts = (profileId, role, yourId, ITEMS_PER_PAGE, page) => {
  return [
    { $match: { profile: new mongoose.Types.ObjectId(profileId) } },

    {
      $facet: {
        count: [
          { $project: { who: "$$ROOT.whoCanSee", _id: 0 } },

          {
            $project: {
              _id: 0,
              filteredPosts: {
                $cond: {
                  if: { $eq: [role, profileRoles.NOT_FRIENDS] },
                  then: {
                    $filter: {
                      input: ["$$ROOT.who"],
                      as: "post",
                      cond: { $eq: ["$$post", whoCanSee_Profile.PUBLIC] },
                    },
                  },
                  else: ["$$ROOT.who"],
                },
              },
            },
          },
          { $unwind: "$filteredPosts" },
          {
            $group: { _id: null, filteredPosts: { $push: "$filteredPosts" } },
          },
          { $project: { postsCount: { $size: "$filteredPosts" }, _id: 0 } },
        ],

        posts: [
          {
            $project: {
              posts: {
                $cond: {
                  if: {
                    $eq: [role, profileRoles.NOT_FRIENDS],
                  },
                  then: {
                    $filter: {
                      input: ["$$ROOT"],
                      as: "post",
                      cond: {
                        $eq: ["$$post.whoCanSee", whoCanSee_Profile.PUBLIC],
                      },
                    },
                  },
                  else: "$$ROOT",
                },
              },
            },
          },

          {
            $unwind: "$posts",
          },
          {
            $project: {
              _id: "$posts._id",
              userId: "$posts.userId",
              description: "$posts.description",
              assets: "$posts.assets",
              numberOfComments: { $size: "$posts.comments" },
              numberOfLikes: { $size: "$posts.likes" },
              createdAt: "$posts.createdAt",
              updatedAt: "$posts.updatedAt",
              userRole: "$posts.userRole",
              isHeLikedInPost: {
                $cond: {
                  if: { $in: [yourId, "$posts.likes"] },
                  then: true,
                  else: false,
                },
              },
              canCommentOrLike: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $eq: [
                          whoCanComment_Page.FOLLOWERS,
                          "$posts.whoCanComment",
                        ],
                      },
                      { $eq: [role, profileRoles.NOT_FRIENDS] },
                    ],
                  },
                  then: false,
                  else: true,
                },
              },
            },
          },
          {
            $sort: { "postsDetails.updatedAt": -1 },
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
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
                firsName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
              post: {
                _idPost: "$_id",
                description: "$description",
                assets: "$assets",
                numberOfComments: "$numberOfComments",
                numberOfLikes: "$numberOfLikes",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                userRole: "$userRole",
                isHeLikedInPost: "$isHeLikedInPost",
                canCommentOrLike: "$canCommentOrLike",
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
                  if: { $eq: ["$owner.userId", yourId] },
                  then: true,
                  else: false,
                },
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        posts: 1,
        totalCount: { $arrayElemAt: ["$count.postsCount", 0] },
      },
    },
  ];
};

export const friends = (
  profileId,
  profilesYouBlocked,
  blockedProfiles,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              FriendsCount: {
                $size: {
                  $setDifference: [
                    "$friends",
                    [...profilesYouBlocked, ...blockedProfiles],
                  ],
                },
              },
            },
          },
        ],
        allFriends: [
          {
            $project: {
              _id: 0,
              friends: {
                $setDifference: [
                  "$friends",
                  [...profilesYouBlocked, ...blockedProfiles],
                ],
              },
            },
          },
          { $unwind: "$friends" },
          {
            $lookup: {
              from: "users",
              localField: "friends",
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
              firsName: "$user.firstName",
              lastName: "$user.lastName",
              logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
            },
          },
        ],
      },
    },
    {
      $project: {
        allFriends: 1,
        totalCount: { $arrayElemAt: ["$totalCount.FriendsCount", 0] },
      },
    },
  ];
};
export const friendsRequestSentToMe = (profileId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              friendsRequestRecieveCount: { $size: "$friendsRequestRecieve" },
            },
          },
        ],
        friendsRequestRecieve: [
          {
            $project: {
              _id: 0,
              friendsRequestRecieve: 1,
            },
          },
          { $unwind: "$friendsRequestRecieve" },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "friendsRequestRecieve.from",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $sort: { "friendsRequestRecieve.dateSending": 1 },
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
              firsName: "$user.firstName",
              lastName: "$user.lastName",
              logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              sendingDate: "$friendsRequestRecieve.dateSending",
            },
          },
        ],
      },
    },
    {
      $project: {
        friendsRequestRecieve: 1,
        totalCount: {
          $arrayElemAt: ["$totalCount.friendsRequestRecieveCount", 0],
        },
      },
    },
  ];
};
export const friendsRequestSentByMe = (profileId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              friendsRequestSendCount: { $size: "$friendsRequestSend" },
            },
          },
        ],
        friendsRequestSend: [
          {
            $project: {
              _id: 0,
              friendsRequestSend: 1,
            },
          },
          { $unwind: "$friendsRequestSend" },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "friendsRequestSend.to",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $sort: { "friendsRequestSend.dateSending": 1 },
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
              firsName: "$user.firstName",
              lastName: "$user.lastName",
              logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              sendingDate: "$friendsRequestSend.dateSending",
            },
          },
        ],
      },
    },
    {
      $project: {
        friendsRequestSend: 1,
        totalCount: {
          $arrayElemAt: ["$totalCount.friendsRequestSendCount", 0],
        },
      },
    },
  ];
};
export const pagesLiked = (profileId, blockedPages, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              PagesCount: {
                $size: {
                  $setDifference: ["$likedPages", blockedPages],
                },
              },
            },
          },
        ],
        allPages: [
          {
            $project: {
              _id: 0,
              likedPages: {
                $setDifference: ["$likedPages", blockedPages],
              },
            },
          },
          { $unwind: "$likedPages" },
          {
            $lookup: {
              from: "pages", // Assuming your user collection is named 'users'
              localField: "likedPages",
              foreignField: "_id",
              as: "page",
            },
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
          {
            $unwind: "$page",
          },
          {
            $project: {
              pageId: "$page._id",
              name: "$page.name",
              logo: "$page.logo",
              bio: "$page.bio",
            },
          },
        ],
      },
    },
    {
      $project: {
        allPages: 1,
        totalCount: { $arrayElemAt: ["$totalCount.PagesCount", 0] },
      },
    },
  ];
};
export const pagesIOwned = (profileId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
    {
      $facet: {
        totalCount: [{ $project: { PagesCount: { $size: "$ownedPage" } } }],
        allPages: [
          {
            $project: {
              _id: 0,
              ownedPage: 1,
            },
          },
          { $unwind: "$ownedPage" },
          {
            $lookup: {
              from: "pages", // Assuming your user collection is named 'users'
              localField: "ownedPage",
              foreignField: "_id",
              as: "page",
            },
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
          },
          {
            $unwind: "$page",
          },
          {
            $project: {
              pageId: "$page._id",
              name: "$page.name",
              logo: "$page.logo",
              bio: "$page.bio",
            },
          },
        ],
      },
    },
    {
      $project: {
        allPages: 1,
        totalCount: { $arrayElemAt: ["$totalCount.PagesCount", 0] },
      },
    },
  ];
};
export const GroupsJoined = (
  profileId,
  page,
  ITEMS_PER_PAGE,
  yourId,
  UniqueIds
) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
    {
      $facet: {
        totalCount: [{ $project: { GroupsCount: { $size: "$groups" } } }],
        allGroups: [
          {
            $project: {
              _id: 0,
              groups: 1,
            },
          },
          { $unwind: "$groups" },
          {
            $lookup: {
              from: "groups",
              localField: "groups",
              foreignField: "_id",
              as: "group",
            },
          },

          {
            $unwind: "$group",
          },

          {
            $project: {
              _id: "$group._id",
              name: "$group.name",
              description: "$group.description",
              cover: "$group.cover",
              visibility: "$group.visibility",
              moderator: "$group.moderator",
              members: "$group.members",
              admins: "$group.admins",
              membersBlocked: "$group.membersBlocked",
              joiningRequests: "$group.joiningRequests",
              YourRole: {
                $cond: {
                  if: { $in: [yourId, "$group.members.userId"] },
                  then: groupRoles.MEMBER,
                  else: {
                    $cond: {
                      if: { $in: [yourId, "$group.admins.userId"] },
                      then: groupRoles.ADMIN,
                      else: {
                        $cond: {
                          if: { $eq: [yourId, "$group.moderator"] },
                          then: groupRoles.MODERATOR,
                          else: groupRoles.NOT_Member,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $match: {
              $or: [
                {
                  $and: [
                    {
                      membersBlocked: {
                        $nin: [new mongoose.Types.ObjectId(yourId)],
                      },
                    },
                    {
                      visibility: visibility.VISIBLE,
                    },
                  ],
                },

                {
                  $and: [
                    {
                      membersBlocked: {
                        $nin: [new mongoose.Types.ObjectId(yourId)],
                      },
                    },

                    {
                      visibility: visibility.HIDDEN,
                    },
                    {
                      $or: [
                        {
                          _id: { $in: UniqueIds },
                        },
                        {
                          "joiningRequests.userId": new mongoose.Types.ObjectId(
                            yourId
                          ),
                        },
                      ],
                    },
                  ],
                },
                {
                  YourRole: {
                    $in: [
                      groupRoles.MEMBER,
                      groupRoles.ADMIN,
                      groupRoles.MODERATOR,
                    ],
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              cover: 1,
            },
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
        allGroups: 1,
        totalCount: { $arrayElemAt: ["$totalCount.GroupsCount", 0] },
      },
    },
  ];
};
export const invitationsSentToMeFromGroups = (
  profileId,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              sentInvitesFromGroupsCount: { $size: "$sentInvitesFromGroups" },
            },
          },
        ],
        sentInvitesFromGroups: [
          {
            $project: {
              _id: 0,
              sentInvitesFromGroups: 1,
            },
          },
          { $unwind: "$sentInvitesFromGroups" },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "sentInvitesFromGroups.senderId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $lookup: {
              from: "groups", // Assuming your user collection is named 'users'
              localField: "sentInvitesFromGroups.groupId",
              foreignField: "_id",
              as: "group",
            },
          },
          {
            $sort: { "sentInvitesFromGroups.inviteDate": 1 },
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
            $unwind: "$group",
          },

          {
            $project: {
              sender: {
                userId: "$user._id",
                firsName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
              group: {
                name: "$group.name",
                description: "$group.description",
                cover: "$group.cover",
                groupId: "$group._id",
              },
              inviteDate: "$sentInvitesFromGroups.inviteDate",
              idInvite:'$sentInvitesFromGroups._id'
            },
          },
        ],
      },
    },
    {
      $project: {
        sentInvitesFromGroups: 1,
        totalCount: {
          $arrayElemAt: ["$totalCount.sentInvitesFromGroupsCount", 0],
        },
      },
    },
  ];
};
export const invitationsSentToMeFromPages = (
  profileId,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              sentInvitesFromPageCount: { $size: "$sentInvitesFromPage" },
            },
          },
        ],
        sentInvitesFromPage: [
          {
            $project: {
              _id: 0,
              sentInvitesFromPage: 1,
            },
          },
          { $unwind: "$sentInvitesFromPage" },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "sentInvitesFromPage.senderId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $lookup: {
              from: "pages", // Assuming your user collection is named 'users'
              localField: "sentInvitesFromPage.pageId",
              foreignField: "_id",
              as: "page",
            },
          },
          {
            $sort: { "sentInvitesFromPage.inviteDate": 1 },
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
            $unwind: "$page",
          },

          {
            $project: {
              sender: {
                userId: "$user._id",
                firsName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
              page: {
                name: "$page.name",
                logo: "$page.logo",
                bio: "$page.bio",
                pageId:"$page._id"
              },
              inviteDate: "$sentInvitesFromPage.inviteDate",
              idInvite:'$sentInvitesFromPage._id'
            },
          },
        ],
      },
    },
    {
      $project: {
        sentInvitesFromPage: 1,
        totalCount: {
          $arrayElemAt: ["$totalCount.sentInvitesFromPageCount", 0],
        },
      },
    },
  ];
};

export const postFromAll = (
  groupIds,
  likedPages,
  ownedPage,
  friends,
  yourId,
  blockedProfiles,
  profilesYouBlocked,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    {
      $match: {
        $or: [
          { group: { $in: groupIds } },
          {
            page: {
              $in: [...likedPages, ...ownedPage],
            },
          },
          {
            profile: {
              $in: [...friends, new mongoose.Types.ObjectId(yourId)],
            },
          },
        ],
      },
    },
    {
      $match: {
        $or: [
          { page: { $exists: true } },
          { profile: { $exists: true } },
          {
            $and: [
              { group: { $exists: true } },
              {
                userId: {
                  $nin: [...blockedProfiles, ...profilesYouBlocked],
                },
              },
            ],
          },
        ],
      },
    },

    { $sort: { updatedAt: -1 } },
    {
      $skip: (page - 1) * ITEMS_PER_PAGE,
    },
    {
      $limit: ITEMS_PER_PAGE,
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
      $lookup: {
        from: "pages",
        localField: "page",
        foreignField: "_id",
        as: "page",
      },
    },

    {
      $unwind: {
        path: "$page",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 0,
        owner: {
          userId: "$user._id",
          firsName: "$user.firstName",
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
          $cond: {
            if: { $ifNull: ["$group", false] },
            then: {
              groupId: "$group._id",
              description: "$group.description",
              name: "$group.name",
              cover: "$group.cover",
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
            else: "$$REMOVE",
          },
        },
        page: {
          $cond: {
            if: { $ifNull: ["$page", false] },
            then: {
              pageId: "$page._id",
              name: "$page.name",
              logo: "$page.logo",
            },
            else: "$$REMOVE",
          },
        },
      },
    },
    {
      $addFields: {
        postType: {
          $cond: {
            if: { $ifNull: ["$group", false] },
            then: "group",
            else: {
              $cond: {
                if: { $ifNull: ["$page", false] },
                then: "page",
                else: "profile",
              },
            },
          },
        },
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
            if: { $ifNull: ["$group", false] },
            then: {
              $or: [
                { $eq: ["$owner.userId", yourId] },
                {
                  $and: [
                    { $eq: ["$group.yourRoleInGroup", groupRoles.ADMIN] },
                    { $eq: ["$post.userRole", groupRoles.MEMBER] },
                  ],
                },
                { $eq: ["$group.yourRoleInGroup", groupRoles.MODERATOR] },
              ],
            },
            else: {
              $eq: ["$owner.userId", yourId],
            },
          },
        },
        canReport: {
          $cond: {
            if: { $ifNull: ["$group", false] },
            then: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$post.userRole", groupRoles.MODERATOR] },
                    { $ne: ["$owner.userId", yourId] },
                    { $ne: ["$group.yourRoleInGroup", groupRoles.MODERATOR] },
                  ],
                },
                then: true,
                else: false,
              },
            },
            else: "$$REMOVE",
          },
        },
        canBlocked: {
          $cond: {
            if: { $ifNull: ["$group", false] },
            then: {
              $cond: {
                if: {
                  $or: [
                    {
                      $and: [
                        {
                          $in: ["$post.userRole", [groupRoles.MEMBER]],
                        },
                        { $eq: ["$group.yourRoleInGroup", groupRoles.ADMIN] },
                        { $ne: ["$owner.userId", yourId] },
                      ],
                    },
                    {
                      $and: [
                        {
                          $eq: ["$group.yourRoleInGroup", groupRoles.MODERATOR],
                        },
                        { $ne: ["$owner.userId", yourId] },
                      ],
                    },
                  ],
                },
                then: true,
                else: false,
              },
            },
            else: "$$REMOVE",
          },
        },
      },
    },
  ];
};
export const pepole = (query, yourId, page, ITEMS_PER_PAGE) => {
  return [
    {
      $match: {
        $text: { $search: query.toString() },
      },
    },
    {
      $project: {
        _id: "$_id",
        firstName: "$firstName",
        lastName: "$lastName",
        blockedProfiles: "$blockedProfiles",
        profilesYouBlocked: "$profilesYouBlocked",
        friends: "$friends",
        logo: { $arrayElemAt: ["$profilePhotos", -1] },
      },
    },

    {
      $match: {
        $and: [
          {
            profilesYouBlocked: { $nin: [yourId] },
          },
          {
            blockedProfiles: { $nin: [yourId] },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        logo: 1,
        areYouFriends: {
          $cond: {
            if: { $in: [yourId, "$friends"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $skip: (page - 1) * ITEMS_PER_PAGE,
    },
    {
      $limit: ITEMS_PER_PAGE,
    },
  ];
};
export const pages = (query, yourId, page, ITEMS_PER_PAGE) => {
  return [
    {
      $match: {
        $text: { $search: query.toString() },
      },
    },

    {
      $project: {
        _id: "$_id",
        name: "$name",

        logo: "$logo",
        bio: "$bio",
        usersLiked: "$usersLiked",
        usersBlocked: "$usersBlocked",
        owner: 1,
      },
    },
    {
      $match: {
        usersBlocked: { $nin: [yourId] },
      },
    },

    {
      $project: {
        _id: 1,
        name: 1,
        logo: 1,
        bio: 1,
        areYouFollowers: {
          $cond: {
            if: { $in: [yourId, "$usersLiked"] },
            then: true,
            else: false,
          },
        },
        areYouOwner: {
          $cond: {
            if: { $eq: [yourId, "$owner"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $skip: (page - 1) * ITEMS_PER_PAGE,
    },
    {
      $limit: ITEMS_PER_PAGE,
    },
  ];
};
export const groups = (query, yourId, UniqueIds, page, ITEMS_PER_PAGE) => {
  return [
    {
      $match: {
        $text: { $search: query.toString() },
      },
    },
    {
      $project: {
        _id: "$_id",
        name: "$name",
        description: "$description",
        cover: "$cover",
        visibility: "$visibility",
        moderator: "$moderator",
        members: "$members",
        admins: "$admins",
        membersBlocked: "$membersBlocked",
        joiningRequests: "$joiningRequests",
        YourRole: {
          $cond: {
            if: { $in: [yourId, "$members.userId"] },
            then: groupRoles.MEMBER,
            else: {
              $cond: {
                if: { $in: [yourId, "$admins.userId"] },
                then: groupRoles.ADMIN,
                else: {
                  $cond: {
                    if: { $eq: [yourId, "$moderator"] },
                    then: groupRoles.MODERATOR,
                    else: groupRoles.NOT_Member,
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $match: {
        $or: [
          {
            $and: [
              {
                membersBlocked: {
                  $nin: [new mongoose.Types.ObjectId(yourId)],
                },
              },
              {
                visibility: visibility.VISIBLE,
              },
            ],
          },

          {
            $and: [
              {
                membersBlocked: {
                  $nin: [new mongoose.Types.ObjectId(yourId)],
                },
              },

              {
                visibility: visibility.HIDDEN,
              },
              {
                $or: [
                  {
                    _id: { $in: UniqueIds },
                  },
                  {
                    "joiningRequests.userId": new mongoose.Types.ObjectId(
                      yourId
                    ),
                  },
                ],
              },
            ],
          },
          {
            YourRole: {
              $in: [groupRoles.MEMBER, groupRoles.ADMIN, groupRoles.MODERATOR],
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        cover: 1,
        YourRole: {
          $cond: {
            if: { $in: [yourId, "$members.userId"] },
            then: groupRoles.MEMBER,
            else: {
              $cond: {
                if: { $in: [yourId, "$admins.userId"] },
                then: groupRoles.ADMIN,
                else: {
                  $cond: {
                    if: { $eq: [yourId, "$moderator"] },
                    then: groupRoles.MODERATOR,
                    else: groupRoles.NOT_Member,
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $skip: (page - 1) * ITEMS_PER_PAGE,
    },
    {
      $limit: ITEMS_PER_PAGE,
    },
  ];
};
