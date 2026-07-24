const ticketHandler = require('../handlers/ticketHandler');
const leaveHandler = require('../handlers/leaveHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // ==== أوامر السلاش ====
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        return command.execute(interaction);
      }

      // ==== اختيار نوع التذكرة (فتح تذكرة جديدة) ====
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create_select') {
        return ticketHandler.handleCreateTicket(interaction);
      }

      // ==== أزرار التذاكر ====
      if (interaction.isButton()) {
        const id = interaction.customId;

        if (id === 'ticket_claim') return ticketHandler.handleClaim(interaction);
        if (id === 'ticket_call') return ticketHandler.handleCall(interaction);
        if (id === 'ticket_rename') return ticketHandler.openRenameModal(interaction);
        if (id === 'ticket_add') return ticketHandler.openAddMemberModal(interaction);
        if (id === 'ticket_remove') return ticketHandler.openRemoveMemberModal(interaction);
        if (id === 'ticket_close') return ticketHandler.handleClose(interaction);

        if (id.startsWith('leave_approve_')) return leaveHandler.approveLeave(interaction, id.replace('leave_approve_', ''));
        if (id.startsWith('leave_reject_')) return leaveHandler.rejectLeave(interaction, id.replace('leave_reject_', ''));

        if (id === 'leave_break_confirm_self') {
          const result = await leaveHandler.finalizeLeave(interaction.guild, interaction.user.id, { endType: 'broken', brokenById: interaction.user.id });
          if (!result) return interaction.update({ content: '❌ لا توجد إجازة نشطة.', embeds: [], components: [] });
          return interaction.update({
            content: `✅ تم كسر إجازتك. الساعات المستخدمة: **${result.actualHoursUsed}**، رصيدك المتبقي: **${result.remaining}** ساعة`,
            embeds: [], components: []
          });
        }
      }

      // ==== المودالات ====
      if (interaction.isModalSubmit()) {
        const id = interaction.customId;
        if (id === 'ticket_rename_modal') return ticketHandler.handleRenameSubmit(interaction);
        if (id === 'ticket_add_modal') return ticketHandler.handleAddSubmit(interaction);
        if (id === 'ticket_remove_modal') return ticketHandler.handleRemoveSubmit(interaction);
      }
    } catch (err) {
      console.error('خطأ في التعامل مع التفاعل:', err);
      const errMsg = { content: '⚠️ صار خطأ غير متوقع أثناء تنفيذ هذا الإجراء.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        interaction.followUp(errMsg).catch(() => {});
      } else {
        interaction.reply(errMsg).catch(() => {});
      }
    }
  }
};
