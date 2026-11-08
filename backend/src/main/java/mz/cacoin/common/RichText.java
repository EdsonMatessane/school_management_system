package mz.cacoin.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Conteúdo formatado (documento TipTap em JSON) usado em descrições, especificações e mensagens. */
public final class RichText {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private RichText() {}

  public static boolean isBlank(String value) {
    return toPlainText(value, false).isBlank();
  }

  /** Converte o documento em texto simples; com {@code whatsappMarks} mantém negrito, itálico e tachado. */
  public static String toPlainText(String value, boolean whatsappMarks) {
    if (value == null || value.isBlank()) {
      return "";
    }
    String trimmed = value.trim();
    JsonNode root = parse(trimmed);
    if (root == null) {
      return trimmed;
    }
    StringBuilder builder = new StringBuilder();
    block(root, builder, whatsappMarks, "");
    return builder.toString().replaceAll("[ \\t]+\\n", "\n").replaceAll("\\n{3,}", "\n\n").trim();
  }

  private static JsonNode parse(String value) {
    if (!value.startsWith("{")) {
      return null;
    }
    try {
      JsonNode node = MAPPER.readTree(value);
      return node != null && "doc".equals(node.path("type").asText()) ? node : null;
    } catch (Exception exception) {
      return null;
    }
  }

  private static void block(JsonNode node, StringBuilder out, boolean marks, String prefix) {
    String type = node.path("type").asText();
    switch (type) {
      case "text" -> out.append(applyMarks(node, marks));
      case "hardBreak" -> out.append('\n');
      case "horizontalRule" -> out.append("\n---\n");
      case "bulletList", "orderedList" -> {
        int index = 1;
        for (JsonNode item : node.path("content")) {
          out.append(type.equals("bulletList") ? "- " : (index++) + ". ");
          children(item, out, marks);
          out.append('\n');
        }
        out.append('\n');
      }
      case "doc" -> {
        for (JsonNode child : node.path("content")) {
          block(child, out, marks, prefix);
        }
      }
      default -> {
        children(node, out, marks);
        out.append("\n\n");
      }
    }
  }

  private static void children(JsonNode node, StringBuilder out, boolean marks) {
    boolean first = true;
    for (JsonNode child : node.path("content")) {
      String type = child.path("type").asText();
      if ("paragraph".equals(type) || "listItem".equals(type)) {
        if (!first) {
          out.append('\n');
        }
        children(child, out, marks);
      } else if ("bulletList".equals(type) || "orderedList".equals(type)) {
        out.append('\n');
        block(child, out, marks, "");
      } else {
        block(child, out, marks, "");
      }
      first = false;
    }
  }

  private static String applyMarks(JsonNode node, boolean marks) {
    String text = node.path("text").asText("");
    if (!marks || text.isBlank()) {
      return text;
    }
    String result = text;
    for (JsonNode mark : node.path("marks")) {
      switch (mark.path("type").asText()) {
        case "bold" -> result = "*" + result + "*";
        case "italic" -> result = "_" + result + "_";
        case "strike" -> result = "~" + result + "~";
        default -> { }
      }
    }
    return result;
  }
}
