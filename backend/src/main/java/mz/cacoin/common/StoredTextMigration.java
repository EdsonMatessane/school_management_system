package mz.cacoin.common;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.courses.modalities.Modality;
import mz.cacoin.courses.modalities.ModalityRepository;
import mz.cacoin.courses.categories.Category;
import mz.cacoin.courses.categories.CategoryRepository;
import mz.cacoin.courses.levels.Level;
import mz.cacoin.courses.levels.LevelRepository;
import mz.cacoin.courses.enrollmentfees.EnrollmentFee;
import mz.cacoin.courses.enrollmentfees.EnrollmentFeeRepository;
import mz.cacoin.courses.manualfees.ManualFee;
import mz.cacoin.courses.manualfees.ManualFeeRepository;
import mz.cacoin.courses.monthlyfees.MonthlyFee;
import mz.cacoin.courses.monthlyfees.MonthlyFeeRepository;
import mz.cacoin.folder.Folder;
import mz.cacoin.folder.FolderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@RequiredArgsConstructor
public class StoredTextMigration implements ApplicationRunner {
  private final FolderRepository folders;
  private final CourseRepository courses;
  private final LevelRepository levels;
  private final ModalityRepository modalities;
  private final CategoryRepository categories;
  private final MonthlyFeeRepository monthlyFees;
  private final EnrollmentFeeRepository enrollmentFees;
  private final ManualFeeRepository manualFees;
  private final TransactionTemplate transactionTemplate;

  @Value("${cacoin.storage.folder-root:./data/cacoin-folders}")
  private Path storageRoot;

  @Override
  public void run(ApplicationArguments arguments) {
    transactionTemplate.executeWithoutResult(status -> normalizeStoredText());
  }

  private void normalizeStoredText() {
    normalizeCourses();
    normalizeLevels();
    normalizeCategories();
    normalizeModalities();
    normalizeMonthlyFees();
    normalizeEnrollmentFees();
    normalizeManualFees();
    normalizeFolders();
  }

  private void normalizeCourses() {
    List<Course> storedCourses = courses.findAllByOrderByIdAsc();
    Set<String> names = new HashSet<>();
    for (Course course : storedCourses) {
      String normalizedName = TextNormalizer.normalize(course.getName());
      if (!names.add(normalizedName)) {
        throw new IllegalStateException(
            "A normalização encontrou cursos com nomes duplicados: " + normalizedName);
      }
      course.setName(normalizedName);
    }
    courses.saveAll(storedCourses);
  }

  private void normalizeLevels() {
    List<Level> storedLevels = levels.findAll();
    Set<String> names = new HashSet<>();
    for (Level level : storedLevels) {
      String normalizedName = TextNormalizer.normalize(level.getName());
      if (!names.add(normalizedName)) {
        throw new IllegalStateException(
            "A normalização encontrou níveis com nomes duplicados: " + normalizedName);
      }
      level.setName(normalizedName);
      level.setDescription(TextNormalizer.normalize(level.getDescription()));
    }
    levels.saveAll(storedLevels);
  }

  private void normalizeCategories() {
    List<Category> storedCategories = categories.findAll();
    Set<String> names = new HashSet<>();
    for (Category category : storedCategories) {
      String normalizedName = TextNormalizer.normalize(category.getName());
      if (!names.add(normalizedName)) {
        throw new IllegalStateException(
            "A normalização encontrou categorias com nomes duplicados: " + normalizedName);
      }
      category.setName(normalizedName);
      category.setDescription(TextNormalizer.normalize(category.getDescription()));
    }
    categories.saveAll(storedCategories);
  }

  private void normalizeModalities() {
    List<Modality> storedModalities = modalities.findAll();
    Set<String> names = new HashSet<>();
    for (Modality modality : storedModalities) {
      String normalizedName = TextNormalizer.normalize(modality.getName());
      if (!names.add(normalizedName)) {
        throw new IllegalStateException(
            "A normalização encontrou modalidades com nomes duplicados: " + normalizedName);
      }
      modality.setName(normalizedName);
      modality.setDescription(TextNormalizer.normalize(modality.getDescription()));
    }
    modalities.saveAll(storedModalities);
  }

  private void normalizeMonthlyFees() {
    List<MonthlyFee> storedMonthlyFees = monthlyFees.findAll();
    Set<String> types = new HashSet<>();
    for (MonthlyFee monthlyFee : storedMonthlyFees) {
      String normalizedType = TextNormalizer.normalize(monthlyFee.getType());
      if (!types.add(normalizedType)) {
        throw new IllegalStateException(
            "A normalização encontrou mensalidades com tipos duplicados: " + normalizedType);
      }
      monthlyFee.setType(normalizedType);
      monthlyFee.setDescription(TextNormalizer.normalize(monthlyFee.getDescription()));
    }
    monthlyFees.saveAll(storedMonthlyFees);
  }

  private void normalizeEnrollmentFees() {
    List<EnrollmentFee> storedFees = enrollmentFees.findAll();
    normalizeFeeTypes(
        storedFees.stream().map(EnrollmentFee::getType).toList(),
        storedFees.stream().map(EnrollmentFee::getDescription).toList(),
        values -> {
          for (int index = 0; index < storedFees.size(); index++) {
            storedFees.get(index).setType(values.get(index * 2));
            storedFees.get(index).setDescription(values.get(index * 2 + 1));
          }
          enrollmentFees.saveAll(storedFees);
        },
        "taxas de inscrição");
  }

  private void normalizeManualFees() {
    List<ManualFee> storedFees = manualFees.findAll();
    normalizeFeeTypes(
        storedFees.stream().map(ManualFee::getType).toList(),
        storedFees.stream().map(ManualFee::getDescription).toList(),
        values -> {
          for (int index = 0; index < storedFees.size(); index++) {
            storedFees.get(index).setType(values.get(index * 2));
            storedFees.get(index).setDescription(values.get(index * 2 + 1));
          }
          manualFees.saveAll(storedFees);
        },
        "taxas de manual");
  }

  private void normalizeFeeTypes(
      List<String> types,
      List<String> descriptions,
      java.util.function.Consumer<List<String>> saveNormalized,
      String feeName) {
    Set<String> normalizedTypes = new HashSet<>();
    List<String> normalizedValues = new ArrayList<>(types.size() * 2);
    for (int index = 0; index < types.size(); index++) {
      String normalizedType = TextNormalizer.normalize(types.get(index));
      if (!normalizedTypes.add(normalizedType)) {
        throw new IllegalStateException(
            "A normalização encontrou " + feeName + " com tipos duplicados: " + normalizedType);
      }
      normalizedValues.add(normalizedType);
      normalizedValues.add(TextNormalizer.normalize(descriptions.get(index)));
    }
    saveNormalized.accept(normalizedValues);
  }

  private void normalizeFolders() {
    List<Folder> storedFolders = folders.findAllByOrderByNameAsc();
    Map<Long, Folder> byId = new HashMap<>();
    Map<Long, String> normalizedNames = new HashMap<>();
    Map<Long, Long> parentIds = new HashMap<>();
    Set<String> siblingNames = new HashSet<>();

    for (Folder folder : storedFolders) {
      byId.put(folder.getId(), folder);
      normalizedNames.put(folder.getId(), TextNormalizer.normalize(folder.getName()));
      Long parentId = folder.getParent() == null ? null : folder.getParent().getId();
      parentIds.put(folder.getId(), parentId);
      String siblingKey = parentId + "\u0000" + normalizedNames.get(folder.getId());
      if (!siblingNames.add(siblingKey)) {
        throw new IllegalStateException(
            "A normalização encontrou pastas duplicadas no mesmo nível: "
                + normalizedNames.get(folder.getId()));
      }
    }

    List<Folder> ordered = storedFolders.stream()
        .sorted(Comparator.comparingInt(folder -> depth(folder, byId)))
        .toList();
    List<PathMove> movedPaths = new ArrayList<>();
    try {
      for (Folder folder : ordered) {
        String originalName = folder.getName();
        String normalizedName = normalizedNames.get(folder.getId());
        if (originalName.equals(normalizedName)) {
          continue;
        }

        Path parentPath = folderParentPath(folder, byId, normalizedNames, parentIds);
        Path source = parentPath.resolve(folder.getId() + "-" + originalName).normalize();
        Path destination = parentPath.resolve(folder.getId() + "-" + normalizedName).normalize();
        if (Files.exists(source)) {
          if (Files.exists(destination)) {
            throw new IllegalStateException(
                "Não foi possível normalizar a pasta porque o destino já existe: " + destination);
          }
          Files.move(source, destination);
          movedPaths.add(new PathMove(source, destination));
        }
        folder.setName(normalizedName);
      }
      folders.saveAll(storedFolders);
    } catch (IOException | RuntimeException exception) {
      rollbackMoves(movedPaths, exception);
      if (exception instanceof IllegalStateException stateException) {
        throw stateException;
      }
      throw new IllegalStateException("Não foi possível normalizar os nomes das pastas.", exception);
    }
  }

  private Path folderParentPath(
      Folder folder,
      Map<Long, Folder> byId,
      Map<Long, String> normalizedNames,
      Map<Long, Long> parentIds) {
    Long parentId = parentIds.get(folder.getId());
    if (parentId == null) {
      return storageRoot;
    }
    Folder parent = byId.get(parentId);
    return folderParentPath(parent, byId, normalizedNames, parentIds)
        .resolve(parent.getId() + "-" + normalizedNames.get(parent.getId()))
        .normalize();
  }

  private int depth(Folder folder, Map<Long, Folder> byId) {
    int depth = 0;
    Folder parent = folder.getParent();
    while (parent != null) {
      depth++;
      parent = byId.get(parent.getId()).getParent();
    }
    return depth;
  }

  private void rollbackMoves(List<PathMove> movedPaths, Exception originalFailure) {
    for (int index = movedPaths.size() - 1; index >= 0; index--) {
      PathMove move = movedPaths.get(index);
      try {
        Files.move(move.destination(), move.source());
      } catch (IOException rollbackFailure) {
        originalFailure.addSuppressed(rollbackFailure);
      }
    }
  }

  private record PathMove(Path source, Path destination) {}
}
