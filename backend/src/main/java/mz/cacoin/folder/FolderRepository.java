package mz.cacoin.folder;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FolderRepository extends JpaRepository<Folder, Long> {
  List<Folder> findAllByOrderByNameAsc();

  boolean existsByParentIsNullAndNameIgnoreCase(String name);

  boolean existsByParentIdAndNameIgnoreCase(Long parentId, String name);

  boolean existsByParentIsNullAndNameIgnoreCaseAndIdNot(String name, Long id);

  boolean existsByParentIdAndNameIgnoreCaseAndIdNot(Long parentId, String name, Long id);
}
