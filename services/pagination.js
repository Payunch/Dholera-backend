/* services/pagination.js */
/**
 * Apply pagination (limit/offset) to a Sequelize query and return total count.
 * @param {object} model - Sequelize model.
 * @param {object} where - Where clause object.
 * @param {object} options - { page, pageSize, order }
 * @returns {Promise<{total: number, rows: any[], page: number, pageSize: number}>}
 */
module.exports.paginateModel = async (model, where = {}, options = {}) => {
  const page = parseInt(options.page, 10) || 1;
  const pageSize = parseInt(options.pageSize, 10) || 50;
  const offset = (page - 1) * pageSize;
  const order = options.order || [['createdAt', 'DESC']];

  const { count, rows } = await model.findAndCountAll({
    where,
    order,
    limit: pageSize,
    offset,
  });

  return { total: count, rows, page, pageSize };
};
