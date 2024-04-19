export const information =(totalItems,page,ITEMS_PER_PAGE)=>{

    return {
        totalItems,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
        currentPage: page,
      };
} 