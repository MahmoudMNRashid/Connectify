import mongoose from "mongoose";
import { whoCanComment_Page, whoCanSee_Page } from "../configPage.js";
import { whoCanSee_Profile } from "../configProfile.js";
import { groupRoles, pageRoles, profileRoles } from "../roles.js";

export const commentsForProfilePost = (
  postId,
  role,
  blockedProfiles,
  profilesYouBlocked,
  page,
  ITEMS_PER_PAGE,
  yourId
) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
        // profile: new mongoose.Types.ObjectId(profileId),
      },
    },

    {
      $facet: {
        count: [
          {
            $project: {
              usersId: "$comments.userId",
            },
          },
          {
            $project: {
              commentCount: {
                $size: {
                  $cond: {
                    if: { $ne: [role, profileRoles.OWNER] },
                    then: {
                      $filter: {
                        input: "$usersId",
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
                    else: "$usersId",
                  },
                },
              },
            },
          },
        ],
        comments: [
          {
            $project: {
              _id: 0,
              comments: {
                $cond: {
                  if: { $ne: [role, profileRoles.OWNER] },
                  then: {
                    $filter: {
                      input: "$comments",
                      as: "comment",
                      cond: {
                        $not: {
                          $in: [
                            "$$comment.userId",
                            [...profilesYouBlocked, ...blockedProfiles],
                          ],
                        },
                      },
                    },
                  },
                  else: "$comments",
                },
              },
            },
          },
          {
            $unwind: "$comments",
          },

          {
            $sort: { "comments.createdAt": -1 }, // Sort posts within each group by updatedAt descending
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
              localField: "comments.userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: "$user",
          },
          {
            $project: {
              comment: {
                commentId: "$comments._id",
                assets: "$comments.assets",
                description: "$comments.description",
                createdAt: "$comments.createdAt",
              },
              owner: {
                userId: "$user._id",
                firsName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
            },
          },

          {
            $addFields: {
              areYouOwnerofComment: {
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
                      { $eq: [role, profileRoles.OWNER] },
                    ],
                  },
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
        comments: 1,

        commentsCount: {
          $arrayElemAt: ["$count.commentCount", 0],
        },
      },
    },
  ];
};

export const commentsForPagePost = (
  postId,
  role,
  blockedProfiles,
  profilesYouBlocked,
  page,
  ITEMS_PER_PAGE,
  yourId
) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
    },

    {
      $facet: {
        count: [
          {
            $project: {
              usersId: "$comments.userId",
            },
          },
          {
            $project: {
              commentCount: {
                $size: {
                  $cond: {
                    if: { $ne: [role, pageRoles.MODERATOR] },
                    then: {
                      $filter: {
                        input: "$usersId",
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
                    else: "$usersId",
                  },
                },
              },
            },
          },
        ],
        comments: [
          {
            $project: {
              _id: 0,
              comments: {
                $cond: {
                  if: { $ne: [role, pageRoles.MODERATOR] },
                  then: {
                    $filter: {
                      input: "$comments",
                      as: "comment",
                      cond: {
                        $not: {
                          $in: [
                            "$$comment.userId",
                            [...profilesYouBlocked, ...blockedProfiles],
                          ],
                        },
                      },
                    },
                  },
                  else: "$comments",
                },
              },
            },
          },
          {
            $unwind: "$comments",
          },

          {
            $sort: { "comments.createdAt": -1 }, // Sort posts within each group by updatedAt descending
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
              localField: "comments.userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: "$user",
          },
          {
            $project: {
              comment: {
                commentId: "$comments._id",
                assets: "$comments.assets",
                description: "$comments.description",
                createdAt: "$comments.createdAt",
              },
              owner: {
                userId: "$user._id",
                firsName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
            },
          },

          {
            $addFields: {
              areYouOwnerofComment: {
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
                      { $eq: [role, pageRoles.MODERATOR] },
                    ],
                  },
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
        comments: 1,

        commentsCount: {
          $arrayElemAt: ["$count.commentCount", 0],
        },
      },
    },
  ];
};

export const commentsForGroupPost = (
  postId,
  role,
  blockedProfiles,
  profilesYouBlocked,
  page,
  ITEMS_PER_PAGE,
  yourId
) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
    },

    {
      $facet: {
        count: [
          {
            $project: {
              usersId: "$comments.userId",
            },
          },
          {
            $project: {
              commentCount: {
                $size: {
                  $cond: {
                    if: {
                      $or: [
                        { $ne: [role, groupRoles.MODERATOR] },
                        { $ne: [role, groupRoles.ADMIN] },
                      ],
                    },
                    then: {
                      $filter: {
                        input: "$usersId",
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
                    else: "$userId",
                  },
                },
              },
            },
          },
        ],
        comments: [
          {
            $project: {
              _id: 0,
              comments: {
                $cond: {
                  if: {
                    $or: [
                      { $ne: [role, groupRoles.MODERATOR] },
                      { $ne: [role, groupRoles.ADMIN] },
                    ],
                  },
                  then: {
                    $filter: {
                      input: "$comments",
                      as: "comment",
                      cond: {
                        $not: {
                          $in: [
                            "$$comment.userId",
                            [...profilesYouBlocked, ...blockedProfiles],
                          ],
                        },
                      },
                    },
                  },
                  else: "$comments",
                },
              },
            },
          },
          {
            $unwind: "$comments",
          },
          {
            $sort: { "comments.createdAt": -1 }, // Sort posts within each group by updatedAt descending
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
              localField: "comments.userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: "$user",
          },
          {
            $project: {
              comment: {
                commentId: "$comments._id",
                assets: "$comments.assets",
                description: "$comments.description",
                createdAt: "$comments.createdAt",
                role: "$comments.role",
              },
              owner: {
                userId: "$user._id",
                firsName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
            },
          },

          {
            $addFields: {
              areYouOwnerofComment: {
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
            },
          },
        ],
      },
    },
    {
      $project: {
        comments: 1,

        commentsCount: {
          $arrayElemAt: ["$count.commentCount", 0],
        },
      },
    },
  ];
};

export const likesForProfilePost = (
  postId,
  role,
  blockedProfiles,
  profilesYouBlocked,
  yourId,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
        // profile: new mongoose.Types.ObjectId(profileId),
      },
    },

    {
      $facet: {
        count: [
          {
            $project: {
              likes: "$likes",
            },
          },
          {
            $project: {
              likesCount: {
                $size: {
                  $cond: {
                    if: { $ne: [role, profileRoles.OWNER] },
                    then: {
                      $filter: {
                        input: "$likes",
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
                    else: "$likes",
                  },
                },
              },
            },
          },
        ],
        likes: [
          {
            $project: {
              _id: 0,
              likes: {
                $cond: {
                  if: { $ne: [role, profileRoles.OWNER] },
                  then: {
                    $filter: {
                      input: "$likes",
                      as: "like",
                      cond: {
                        $not: {
                          $in: [
                            "$$like",
                            [...profilesYouBlocked, ...blockedProfiles],
                          ],
                        },
                      },
                    },
                  },
                  else: "$likes",
                },
              },
            },
          },
          {
            $unwind: "$likes",
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
              localField: "likes",
              foreignField: "_id",
              as: "user",
            },
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

          {
            $addFields: {
              areYou: {
                $cond: {
                  if: { $eq: ["$user.userId", yourId] },
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
        likes: 1,

        likesCount: {
          $arrayElemAt: ["$count.likesCount", 0],
        },
      },
    },
  ];
};
export const likesForPagePost = (
  postId,
  role,
  blockedProfiles,
  profilesYouBlocked,
  yourId,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
    },

    {
      $facet: {
        count: [
          {
            $project: {
              likes: "$likes",
            },
          },
          {
            $project: {
              likesCount: {
                $size: {
                  $cond: {
                    if: { $ne: [role, pageRoles.MODERATOR] },
                    then: {
                      $filter: {
                        input: "$likes",
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
                    else: "$likes",
                  },
                },
              },
            },
          },
        ],
        likes: [
          {
            $project: {
              _id: 0,
              likes: {
                $cond: {
                  if: { $ne: [role, pageRoles.MODERATOR] },
                  then: {
                    $filter: {
                      input: "$likes",
                      as: "like",
                      cond: {
                        $not: {
                          $in: [
                            "$$like",
                            [...profilesYouBlocked, ...blockedProfiles],
                          ],
                        },
                      },
                    },
                  },
                  else: "$likes",
                },
              },
            },
          },
          {
            $unwind: "$likes",
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
              localField: "likes",
              foreignField: "_id",
              as: "user",
            },
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

          {
            $addFields: {
              areYou: {
                $cond: {
                  if: { $eq: ["$user.userId", yourId] },
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
        likes: 1,

        likesCount: {
          $arrayElemAt: ["$count.likesCount", 0],
        },
      },
    },
  ];
};
export const likesForGroupPost = (
  postId,
  role,
  blockedProfiles,
  profilesYouBlocked,
  yourId,
  page,
  ITEMS_PER_PAGE
) => {
  return [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
    },

    {
      $facet: {
        count: [
          {
            $project: {
              likes: "$likes",
            },
          },
          {
            $project: {
              likesCount: {
                $size: {
                  $cond: {
                    if: {
                      $or: [
                        { $ne: [role, groupRoles.MODERATOR] },
                        { $ne: [role, groupRoles.ADMIN] },
                      ],
                    },
                    then: {
                      $filter: {
                        input: "$likes",
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
                    else: "$likes",
                  },
                },
              },
            },
          },
        ],
        likes: [
          {
            $project: {
              _id: 0,
              likes: {
                $cond: {
                  if: {
                    $or: [
                      { $ne: [role, groupRoles.MODERATOR] },
                      { $ne: [role, groupRoles.ADMIN] },
                    ],
                  },
                  then: {
                    $filter: {
                      input: "$likes",
                      as: "like",
                      cond: {
                        $not: {
                          $in: [
                            "$$like",
                            [...profilesYouBlocked, ...blockedProfiles],
                          ],
                        },
                      },
                    },
                  },
                  else: "$likes",
                },
              },
            },
          },
          {
            $unwind: "$likes",
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
              localField: "likes",
              foreignField: "_id",
              as: "user",
            },
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

          {
            $addFields: {
              areYou: {
                $cond: {
                  if: { $eq: ["$user.userId", yourId] },
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
        likes: 1,

        likesCount: {
          $arrayElemAt: ["$count.likesCount", 0],
        },
      },
    },
  ];
};

export const searchInProfilePosts = (
  profileId,
  role,
  page,
  ITEMS_PER_PAGE,
  yourId
) => {
  return [
    {
      $match: {
        profile: new mongoose.Types.ObjectId(profileId),
        $text: { $search: word.toString() },
      },
    },
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
            $group: {
              _id: null,
              filteredPosts: { $push: "$filteredPosts" },
            },
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
export const searchInPagePosts = (
  pageId,
  role,
  page,
  ITEMS_PER_PAGE,
  yourId
) => {
  return [
    {
      $match: {
        page: new mongoose.Types.ObjectId(pageId),
        $text: { $search: word.toString() },
      },
    },
    {
      $facet: {
        count: [
          { $project: { who: "$$ROOT.whoCanSee", _id: 0 } },

          {
            $project: {
              _id: 0,
              filteredPosts: {
                $cond: {
                  if: { $eq: [role, pageRoles.NOT_FOLLOWERS] },
                  then: {
                    $filter: {
                      input: ["$$ROOT.who"],
                      as: "post",
                      cond: { $eq: ["$$post", whoCanSee_Page.PUBLIC] },
                    },
                  },
                  else: ["$$ROOT.who"],
                },
              },
            },
          },
          { $unwind: "$filteredPosts" },
          {
            $group: {
              _id: null,
              filteredPosts: { $push: "$filteredPosts" },
            },
          },
          { $project: { postsCount: { $size: "$filteredPosts" }, _id: 0 } },
        ],
        posts: [
          {
            $project: {
              posts: {
                $cond: {
                  if: {
                    $eq: [role, pageRoles.NOT_FOLLOWERS],
                  },
                  then: {
                    $filter: {
                      input: ["$$ROOT"],
                      as: "post",
                      cond: {
                        $eq: ["$$post.whoCanSee", whoCanSee_Page.PUBLIC],
                      },
                    },
                  },
                  else: "$$ROOT",
                },
              },
            },
          },
          { $unwind: "$posts" },
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
                      { $eq: [role, pageRoles.NOT_FOLLOWERS] },
                    ],
                  },
                  then: false,
                  else: true,
                },
              },
            },
          },
          {
            $sort: { "posts.updatedAt": -1 }, // Sort posts within each group by updatedAt descending
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
export const searchInGroupPosts = (
  groupId,
  role,
  blockedProfiles,
  profilesYouBlocked,
  page,
  ITEMS_PER_PAGE,
  yourId
) => {
  return [
    {
      $match: {
        group: new mongoose.Types.ObjectId(groupId),
        $text: { $search: word.toString() },
      },
    },
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
            $project: {
              posts: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: [role, groupRoles.MODERATOR] },
                      { $ne: [role, groupRoles.ADMIN] },
                    ],
                  },
                  then: {
                    $filter: {
                      input: ["$$ROOT"],
                      as: "post",
                      cond: {
                        $not: {
                          $in: [
                            "$$post.userId",
                            [...profilesYouBlocked, ...blockedProfiles],
                          ],
                        },
                      },
                    },
                  },
                  else: "$$ROOT",
                },
              },
            },
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
          {
            $sort: { "posts.updatedAt": -1 }, // Sort posts within each group by updatedAt descending
          },

          {
            $skip: (page - 1) * ITEMS_PER_PAGE,
          },
          {
            $limit: ITEMS_PER_PAGE,
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
              canUpdate: {
                $cond: {
                  if: { $eq: ["$owner.userId", yourId] },
                  then: true,
                  else: false,
                },
              },
              canReport: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$post.userRole", groupRoles.MODERATOR] },
                      { $ne: [role, [groupRoles.NOT_Member]] },
                      { $ne: ["$owner.userId", yourId] },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              canBlocked: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          {
                            $in: ["$post.userRole", [groupRoles.MEMBER]],
                          },
                          { $eq: [role, groupRoles.ADMIN] },
                          { $ne: ["$owner.userId", yourId] },
                        ],
                      },
                      {
                        $and: [
                          { $eq: [role, groupRoles.MODERATOR] },
                          { $ne: ["$owner.userId", yourId] },
                        ],
                      },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              canLikeOrComment: {
                $cond: {
                  if: { $eq: [role, groupRoles.NOT_Member] },
                  then: false,
                  else: true,
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
        totalCount: { $arrayElemAt: ["$count.postCount", 0] },
      },
    },
  ];
};
