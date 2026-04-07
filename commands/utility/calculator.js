const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { evaluate } = require('mathjs');

// ── Layout ────────────────────────────────────────────────────────────────────
// We need max 5 buttons per ActionRow, max 5 rows = 25 buttons total.
// Layout: 4 rows of operator/number buttons + 1 row of control buttons.
//
// Row 1: 7  8  9  /  *
// Row 2: 4  5  6  +  -
// Row 3: 1  2  3  (  )
// Row 4: 0  .  ⌫  C  =
// ─────────────────────────────────────────────────────────────────────────────

// Define button layout: [label, customId, style]
const ROWS = [
  [
    ['7', 'calc_7', ButtonStyle.Secondary],
    ['8', 'calc_8', ButtonStyle.Secondary],
    ['9', 'calc_9', ButtonStyle.Secondary],
    ['÷', 'calc_/', ButtonStyle.Primary],
    ['×', 'calc_*', ButtonStyle.Primary],
  ],
  [
    ['4', 'calc_4', ButtonStyle.Secondary],
    ['5', 'calc_5', ButtonStyle.Secondary],
    ['6', 'calc_6', ButtonStyle.Secondary],
    ['+', 'calc_+', ButtonStyle.Primary],
    ['-', 'calc_-', ButtonStyle.Primary],
  ],
  [
    ['1', 'calc_1', ButtonStyle.Secondary],
    ['2', 'calc_2', ButtonStyle.Secondary],
    ['3', 'calc_3', ButtonStyle.Secondary],
    ['(', 'calc_(', ButtonStyle.Secondary],
    [')', 'calc_)', ButtonStyle.Secondary],
  ],
  [
    ['0', 'calc_0', ButtonStyle.Secondary],
    ['.', 'calc_.', ButtonStyle.Secondary],
    ['⌫', 'calc_back', ButtonStyle.Danger],
    ['C', 'calc_clear', ButtonStyle.Danger],
    ['=', 'calc_eq', ButtonStyle.Success],
  ],
];

// Build all ActionRows from the layout definition above
function buildRows() {
  return ROWS.map(rowDef => {
    const buttons = rowDef.map(([label, id, style]) =>
      new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style)
    );
    return new ActionRowBuilder().addComponents(...buttons);
  });
}

// Build the calculator embed showing the current expression
function buildEmbed(expression, userId) {
  return new EmbedBuilder()
    .setTitle('🧮 Calculator')
    .setDescription(`\`\`\`\n${expression || '0'}\n\`\`\``)
    .setColor('#5865F2')
    .setFooter({ text: `Only ${userId ? `<@${userId}>` : 'you'} can use this calculator` })
    .setTimestamp();
}

// Attempt to evaluate the expression safely with mathjs
function safeEvaluate(expr) {
  try {
    const result = evaluate(expr);

    // Guard against non-finite results (Infinity, NaN)
    if (!isFinite(result)) return 'Error: Division by zero';

    // Format result — trim excessive decimal places
    return String(parseFloat(result.toFixed(10)));
  } catch {
    return 'Error: Invalid expression';
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calculator')
    .setDescription('Open an interactive calculator 🧮'),

  async execute(interaction) {
    // Keep the session private so only the invoking user sees the calculator
    // and so multiple users don't interfere with each other's state
    await interaction.reply({
      embeds: [buildEmbed('', interaction.user.id)],
      components: buildRows(),
      flags: MessageFlags.Ephemeral,
    });

    // Track the current expression in memory for this session
    let expression = '';

    // Listen for button clicks — only accept from the original user
    const collector = interaction.channel.createMessageComponentCollector({
      filter: i =>
        i.user.id === interaction.user.id &&
        i.customId.startsWith('calc_'),
      // Session expires after 5 minutes of inactivity
      idle: 5 * 60 * 1000,
    });

    collector.on('collect', async buttonInteraction => {
      const id = buttonInteraction.customId;

      if (id === 'calc_clear') {
        // Clear the entire expression
        expression = '';
      } else if (id === 'calc_back') {
        // Remove the last character (backspace)
        expression = expression.slice(0, -1);
      } else if (id === 'calc_eq') {
        // Evaluate the expression
        if (!expression) return buttonInteraction.deferUpdate();
        expression = safeEvaluate(expression);
      } else {
        // Append the character represented by the button
        const char = id.replace('calc_', '');

        // Basic guard: don't let the expression grow too long
        if (expression.length >= 50) return buttonInteraction.deferUpdate();

        expression += char;
      }

      // Update the embed with the new expression
      await buttonInteraction.update({
        embeds: [buildEmbed(expression, interaction.user.id)],
        components: buildRows(),
      });
    });

    collector.on('end', async () => {
      // Gracefully handle collector ending (ephemeral replies can't always be edited after expiry)
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🧮 Calculator — Session Ended')
              .setDescription('This calculator session has expired. Run `/calculator` to start a new one.')
              .setColor('#5865F2'),
          ],
          components: [],
        });
      } catch {
        // Ignore errors if the message is no longer editable
      }
    });
  },
};
