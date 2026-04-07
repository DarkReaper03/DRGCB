const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const axios = require('axios');

// Decode HTML entities from the OpenTDB API (they encode things like &amp; &#039; etc.)
function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

// Shuffle an array in place using Fisher-Yates
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Answer a random hard trivia question 🧠'),

  async execute(interaction) {
    // Defer the reply since the API call might take a moment
    await interaction.deferReply();

    let triviaData;
    try {
      const response = await axios.get(
        'https://opentdb.com/api.php?amount=1&difficulty=hard&type=multiple'
      );

      if (response.data.response_code !== 0 || !response.data.results.length) {
        throw new Error('No trivia data returned');
      }

      triviaData = response.data.results[0];
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Could not fetch a trivia question right now. Try again later!')
        .setColor('#F00000');

      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // Decode HTML entities in the question and answers
    const question = decodeHtml(triviaData.question);
    const correctAnswer = decodeHtml(triviaData.correct_answer);
    const wrongAnswers = triviaData.incorrect_answers.map(decodeHtml);

    // Shuffle all 4 answers together
    const allAnswers = shuffle([correctAnswer, ...wrongAnswers]);

    // Build the question embed
    const questionEmbed = new EmbedBuilder()
      .setTitle('🧠 Trivia — Hard')
      .setDescription(`**${question}**`)
      .addFields(
        { name: 'Category', value: decodeHtml(triviaData.category), inline: true },
        { name: 'Difficulty', value: 'Hard', inline: true }
      )
      .setColor('#5865F2')
      .setFooter({ text: 'You have 30 seconds to answer!' })
      .setTimestamp();

    // Build one button per answer — label them A, B, C, D
    const labels = ['A', 'B', 'C', 'D'];
    const buttons = allAnswers.map((answer, i) =>
      new ButtonBuilder()
        .setCustomId(`trivia_${i}`)
        .setLabel(`${labels[i]}: ${answer}`)
        .setStyle(ButtonStyle.Primary)
    );

    // Discord allows max 5 buttons per row; split into rows of 2 for readability
    const row1 = new ActionRowBuilder().addComponents(buttons[0], buttons[1]);
    const row2 = new ActionRowBuilder().addComponents(buttons[2], buttons[3]);

    const message = await interaction.editReply({
      embeds: [questionEmbed],
      components: [row1, row2],
    });

    // Wait for the interaction user to click a button within 30 seconds
    const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('trivia_');

    let buttonInteraction;
    try {
      buttonInteraction = await message.awaitMessageComponent({ filter, time: 30_000 });
    } catch {
      // 30-second timeout expired — reveal the answer and disable buttons
      const timeoutEmbed = new EmbedBuilder()
        .setTitle('⏰ Time\'s Up!')
        .setDescription(`The correct answer was: **${correctAnswer}**`)
        .setColor('#F00000')
        .setTimestamp();

      // Disable all buttons
      const disabledRow1 = new ActionRowBuilder().addComponents(
        buttons.map(b => ButtonBuilder.from(b.toJSON()).setDisabled(true))
          .slice(0, 2)
      );
      const disabledRow2 = new ActionRowBuilder().addComponents(
        buttons.map(b => ButtonBuilder.from(b.toJSON()).setDisabled(true))
          .slice(2, 4)
      );

      return interaction.editReply({
        embeds: [timeoutEmbed],
        components: [disabledRow1, disabledRow2],
      });
    }

    // Check if the clicked answer is correct
    const chosenIndex = parseInt(buttonInteraction.customId.split('_')[1]);
    const chosenAnswer = allAnswers[chosenIndex];
    const isCorrect = chosenAnswer === correctAnswer;

    // Build result embed
    const resultEmbed = new EmbedBuilder()
      .setTitle(isCorrect ? '✅ Correct!' : '❌ Wrong!')
      .setDescription(
        isCorrect
          ? `**${correctAnswer}** is right! Well done!`
          : `You chose **${chosenAnswer}**.\nThe correct answer was **${correctAnswer}**.`
      )
      .setColor(isCorrect ? '#00B000' : '#F00000')
      .setTimestamp();

    // Disable all buttons and color them to show correct/wrong
    const updatedButtons = allAnswers.map((answer, i) => {
      let style;
      if (answer === correctAnswer) {
        style = ButtonStyle.Success; // Green for the correct answer
      } else if (i === chosenIndex && !isCorrect) {
        style = ButtonStyle.Danger;  // Red for the wrong answer the user picked
      } else {
        style = ButtonStyle.Secondary; // Grey for unchosen wrong answers
      }

      return new ButtonBuilder()
        .setCustomId(`trivia_done_${i}`)
        .setLabel(`${labels[i]}: ${answer}`)
        .setStyle(style)
        .setDisabled(true);
    });

    const doneRow1 = new ActionRowBuilder().addComponents(updatedButtons[0], updatedButtons[1]);
    const doneRow2 = new ActionRowBuilder().addComponents(updatedButtons[2], updatedButtons[3]);

    await buttonInteraction.update({
      embeds: [resultEmbed],
      components: [doneRow1, doneRow2],
    });
  },
};
