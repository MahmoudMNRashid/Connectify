import mongoose from "mongoose";
import { pageRoles } from "../roles.js";
import { whoCanComment_Page, whoCanSee_Page } from "../configPage.js";

export const followers = (pageId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(pageId) } },
    {
      $facet: {
        totalCount: [{ $project: { membersCount: { $size: "$usersLiked" } } }],
        allMembers: [
          {
            $project: {
              _id: 0,
              usersLiked: 1,
            },
          },
          { $unwind: "$usersLiked" },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "usersLiked",
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
        allMembers: 1,
        totalCount: { $arrayElemAt: ["$totalCount.membersCount", 0] },
      },
    },
  ];
};
export const usersBlocked = (pageId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(pageId) } },
    {
      $facet: {
        totalCount: [
          { $project: { membersCount: { $size: "$usersBlocked" } } },
        ],
        allMembers: [
          {
            $project: {
              _id: 0,
              usersBlocked: 1,
            },
          },
          { $unwind: "$usersBlocked" },
          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "usersBlocked.userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $sort: { "usersBlocked.date": 1 }, // Sort posts within each group by updatedAt descending
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
              date: "$usersBlocked.date",
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
export const posts = (pageId, yourId, role, page, ITEMS_PER_PAGE) => {
  return [
    {
      $match: { page: new mongoose.Types.ObjectId(pageId) },
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
export const rates = (pageId, yourId, page, ITEMS_PER_PAGE) => {
  return [
    { $match: { _id: new mongoose.Types.ObjectId(pageId) } },
    {
      $facet: {
        totalCount: [
          {
            $project: {
              ratingCount: {
                $size: "$ratings",
              },
            },
          },
        ],
        avgRate: [
          {
            $project: {
              ratings: 1,
            },
          },
          { $unwind: "$ratings" },
          {
            $group: {
              _id: null,
              total: { $avg: "$ratings.value" },
            },
          },
        ],
        ratings: [
          {
            $project: {
              _id: 0,
              ratings: 1,
            },
          },
          { $unwind: "$ratings" },

          {
            $lookup: {
              from: "users", // Assuming your user collection is named 'users'
              localField: "ratings.by",
              foreignField: "_id",
              as: "user",
            },
          },

          {
            $sort: { "ratings.ratingDate": -1 }, // Sort posts within each group by updatedAt descending
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
              from: {
                userId: "$user._id",
                firsName: "$user.firstName",
                lastName: "$user.lastName",
                logo: { $arrayElemAt: ["$user.profilePhotos", -1] },
              },
              infoRate: {
                value: "$ratings.value",
                comment: "$ratings.comment",
                ratingDate: "$ratings.ratingDate",
              },
            },
          },
          {
            $addFields: {
              canDelete: {
                $cond: {
                  if: {
                    $eq: ["$from.userId", yourId],
                  },
                  then: true,
                  else: false,
                },
              },
              canUpdate: {
                $cond: {
                  if: {
                    $eq: ["$from.userId", yourId],
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
        avgRate: 1,
        ratings: 1,
        totalCount: { $arrayElemAt: ["$totalCount.ratingCount", 0] },
      },
    },
  ];
};
export const friendsWhoDidNotJoin = (yourId, pageId, page, ITEMS_PER_PAGE) => {
  return [
    {
      $match: {
        friends: { $in: [new mongoose.Types.ObjectId(yourId)] },
        likedPages: { $nin: [new mongoose.Types.ObjectId(pageId)] },
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
