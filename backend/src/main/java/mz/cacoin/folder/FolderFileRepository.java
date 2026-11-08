package mz.cacoin.folder;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FolderFileRepository extends JpaRepository<FolderFile, Long> {
  List<FolderFile> findAllByFolderIdOrderByNameAsc(Long folderId);

  boolean existsByFolderIdAndNameIgnoreCase(Long folderId, String name);

  Optional<FolderFile> findByIdAndFolderId(Long id, Long folderId);

  void deleteAllByFolderIdIn(Collection<Long> folderIds);

  @Query("select f.folder.id, count(f) from FolderFile f group by f.folder.id")
  List<Object[]> countByFolder();
}
