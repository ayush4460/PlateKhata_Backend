const CustomizationModel = require('../models/customization.model');

class CustomizationService {
  /**
   * Create a group with initial options
   */
  static async createGroupWithOptions(data) {
    const { restaurantId, name, minSelection, maxSelection, isRequired, options } = data;
    
    // Create group
    const group = await CustomizationModel.createGroup({
      restaurantId,
      name,
      minSelection,
      maxSelection,
      isRequired: isRequired || (minSelection > 0)
    });

    // Create options if provided
    let createdOptions = [];
    if (options && Array.isArray(options)) {
        for (const [index, opt] of options.entries()) {
            const option = await CustomizationModel.addOption({
                groupId: group.group_id,
                name: opt.name,
                isAvailable: opt.isAvailable,
                displayOrder: index
            });
            createdOptions.push(option);
        }
    }

    return { ...group, options: createdOptions };
  }

  static async getGroups(restaurantId) {
    return CustomizationModel.getGroupsByRestaurant(restaurantId);
  }

  static async updateGroup(groupId, updates) {
    // 1. Update Group details
    const group = await CustomizationModel.updateGroup(groupId, updates);
    
    // 2. Handle options update/create/delete if needed (Basic implementation update logic typically separate)
    // For this pass, we'll assume options are managed separately or simplistic array sync is complex.
    // We will support adding/removing options via separate calls or intelligent sync here.
    
    // Sync options if provided
    if (updates.options && Array.isArray(updates.options)) {
        // This is a simplified "replace/merge" logic
        for (const opt of updates.options) {
            if (opt.option_id) {
                // Update
                await CustomizationModel.updateOption(opt.option_id, opt);
            } else {
                // Create
                await CustomizationModel.addOption({ ...opt, groupId });
            }
        }
    }

    return group;
  }

  static async deleteGroup(groupId) {
    return CustomizationModel.deleteGroup(groupId);
  }

  static async assignToItem(itemId, groupId, options) {
    return CustomizationModel.assignToItem(itemId, groupId, options);
  }

  static async removeItemCustomization(itemId, groupId) {
    return CustomizationModel.removeItemCustomization(itemId, groupId);
  }

  static async getItemCustomizations(itemId) {
    return CustomizationModel.getItemCustomizations(itemId);
  }
}

module.exports = CustomizationService;
